<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Lead;
use App\Models\Product;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateLeadRequest;
use App\Http\Requests\StoreLeadRequest;
use App\Events\LeadCreated;
use App\Models\User as UserModel;
use App\Models\SalesConsultant;
use Carbon\Carbon;
use App\Events\LeadUpdated;
use App\Http\Requests\UpdateSalesConsultantRequest;
use App\Http\Requests\StoreSalesConsultantRequest;

class SalesConsultantController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = Lead::query()
                ->with(['assignedUser', 'product'])
                ->where('assigned_user_id', Auth::id()) // Only get leads assigned to current user
                ->when($request->search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
                })
                ->when($request->lead_status, function ($query, $status) {
                    $query->where('lead_status', $status);
                })
                ->when($request->lead_source, function ($query, $source) {
                    $query->where('lead_source', $source);
                })
                ->when($request->lead_active_status !== null, function ($query) use ($request) {
                    $query->whereRaw('lead_active_status = ?', [$request->lead_active_status === '1']);
                })
                ->when($request->followup_filter, function ($query, $filter) {
                    switch ($filter) {
                        case 'today':
                            $query->whereDate('followup_date', today());
                            break;
                        case 'week':
                            $query->whereBetween('followup_date', [now()->startOfWeek(), now()->endOfWeek()]);
                            break;
                        case 'month':
                            $query->whereBetween('followup_date', [now()->startOfMonth(), now()->endOfMonth()]);
                            break;
                        case 'overdue':
                            $query->where('followup_date', '<', today())
                                ->where('lead_status', '!=', 'Won')
                                ->where('lead_status', '!=', 'Lost')
                                ->where('lead_active_status', true);
                            break;
                    }
                })
                ->when($request->product_id, function ($query, $productId) {
                    $query->where('product_id', $productId);
                })
                ->when($request->notification_status !== null, function ($query) use ($request) {
                    $query->whereRaw('notification_status = ?', [($request->notification_status === '1') ? 'true' : 'false']);
                });

            $query->orderByDesc('lead_active_status')
                ->orderBy('followup_date')
                ->orderBy(DB::raw("CASE 
                    WHEN followup_period = 'AM' THEN 1 
                    WHEN followup_period = 'PM' THEN 2 
                    ELSE 3 END"))
                ->orderBy('followup_hour')
                ->orderBy('followup_minute');

            $perPage = $request->input('per_page', 10);
            $leads = $query->latest()->paginate($perPage);
            
            $leads->through(function ($lead) {
                $lead->followup_required = $lead->followup_date && 
                    Carbon::parse($lead->followup_date)->endOfDay()->isPast();
                return $lead;
            });

            // Get all active users for lead assignment
            $users = UserModel::whereRaw('is_active = true')
                ->orderBy('name')
                ->get(['id', 'name']);

            // Define lead constants using the Lead model constants
            $leadConstants = [
                'SOURCES' => Lead::LEAD_SOURCES,
                'STATUSES' => Lead::STATUSES,
                'CITIES' => Lead::CITIES,
            ];

            return Inertia::render('SalesConsultant/SCLeadIndex', [
                'auth' => [
                    'user' => Auth::user()
                ],
                'leads' => $leads,
                'filters' => $request->only([
                    'search',
                    'lead_status',
                    'lead_source',
                    'followup_filter',
                    'lead_active_status',
                    'product_id',
                    'notification_status',
                    'per_page'
                ]),
                'products' => Product::whereRaw('active_status = true')
                    ->orderBy('name')
                    ->get(['id', 'name']),
                'leadConstants' => $leadConstants,
                'users' => $users,
            ]);
        } catch (\Exception $e) {
            return back()->withError($e->getMessage());
        }
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created lead for sales consultant.
     */
    public function store(StoreLeadRequest $request)
    {
        try {
            $validated = $request->validated();
            
            // Create the lead with explicit boolean using DB::raw
            $lead = Lead::create([
                'name' => $validated['name'],
                'phone' => $validated['phone'],
                'assigned_user_id' => $validated['assigned_user_id'],
                'lead_source' => $validated['lead_source'],
                'lead_status' => $validated['lead_status'] ?? 'Query',
                'initial_remarks' => $validated['initial_remarks'] ?? null,
                'followup_date' => $validated['followup_date'] ?? null,
                'followup_hour' => $validated['followup_hour'] ?? null,
                'followup_minute' => $validated['followup_minute'] ?? null,
                'followup_period' => $validated['followup_period'] ?? null,
                'lead_active_status' => DB::raw('true'),  // Use DB::raw for boolean
                'notification_status' => DB::raw('false'),  // Set to false for new leads
                'product_id' => $validated['product_id'] ?? null,
                'email' => $validated['email'] ?? $validated['phone'] . '@test.com',
                'city' => $validated['city'] ?? 'Others',
                'assigned_at' => now(),
            ]);

            // Broadcast the event
            event(new LeadCreated($lead));

            return redirect()->back()->with('success', 'Lead created successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Failed to create lead. ' . $e->getMessage()]);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(SalesConsultant $salesConsultant)
    {
        //
    }

    /**
     * Show the form for editing the specified lead.
     */
    public function edit(Lead $lead)
    {
        // Check if the lead is assigned to the current user
        if ($lead->assigned_user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }

        // Mark the lead as viewed (notification_status = true)
        $lead->update([
            'notification_status' => DB::raw('true')
        ]);

        return Inertia::render('SalesConsultant/SCLeadEdit', [
            'lead' => $lead->load([
                'assignedUser',
                'notes.user',
                'documents.user'
            ]),
            'users' => UserModel::whereRaw('is_active = true')->get(['id', 'name']),
            'leadConstants' => [
                'STATUSES' => Lead::STATUSES,
                'SOURCES' => Lead::LEAD_SOURCES,
                'CITIES' => Lead::CITIES,
            ],
            'products' => Product::whereRaw('active_status = true')
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    /**
     * Update the specified lead.
     */
    public function update(UpdateLeadRequest $request, Lead $lead)
    {
        // Check if the lead is assigned to the current user
        if ($lead->assigned_user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validated();

        // Handle assigned user change
        if ($lead->assigned_user_id !== $validated['assigned_user_id']) {
            $validated['assigned_at'] = now();
            $validated['notification_status'] = DB::raw('false'); // Set notification to false for new assignee
        }

        // Handle lead status change
        if ($validated['lead_status'] === 'Won') {
            $validated['won_at'] = now();
        } elseif ($lead->lead_status === 'Won' && $validated['lead_status'] !== 'Won') {
            $validated['won_at'] = null;
        }

        // Handle active status change
        if (!$validated['lead_active_status'] && $lead->lead_active_status) {
            $validated['closed_at'] = now();
        }

        $lead->update($validated);

        // Broadcast the event
        event(new LeadUpdated($lead));

        return redirect()->back()->with('success', 'Lead updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(SalesConsultant $salesConsultant)
    {
        //
    }
}
