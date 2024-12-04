<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Http\Requests\StoreLeadRequest;
use App\Http\Requests\UpdateLeadRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\LeadsImport;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use App\Models\Product;
use App\Events\LeadUpdated;
use App\Events\LeadCreated;

class LeadController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = Lead::query()
                ->with(['assignedUser', 'product'])
                ->when($request->search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
                })
                ->when($request->assigned_user_id, function ($query, $userId) {
                    $query->where('assigned_user_id', $userId);
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
                            $query->whereMonth('followup_date', now()->month)
                                ->whereYear('followup_date', now()->year);
                            break;
                        case 'overdue':
                            $query->where('followup_date', '<', today())
                                ->where('updated_at', '<', today());
                            break;
                    }
                })
                ->when($request->product_id, function ($query, $productId) {
                    $query->where('product_id', $productId);
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

            $users = User::whereRaw('is_active = true')->get(['id', 'name']);

            return Inertia::render('Lead/LeadIndex', [
                'auth' => [
                    'user' => Auth::user()
                ],
                'leads' => $leads,
                'filters' => $request->all(['search', 'assigned_user_id', 'lead_status', 'lead_source', 'followup_filter', 'lead_active_status']),
                'users' => $users,
                'leadConstants' => [
                    'STATUSES' => Lead::STATUSES,
                    'SOURCES' => Lead::LEAD_SOURCES,
                ],
                'products' => Product::whereRaw('active_status =true')
                    ->orderBy('name')
                    ->get(['id', 'name']),
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in LeadController@index', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
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
     * Store a newly created resource in storage.
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
                'product_id' => $validated['product_id'] ?? null,
                'email' => $validated['email'] ?? $validated['phone'] . '@test.com',
                'city' => $validated['city'] ?? 'Others',
                'assigned_at' => $validated['assigned_user_id'] ? now() : null,
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
    public function show(Lead $lead)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Lead $lead)
    {
        return Inertia::render('Lead/LeadEdit', [
            'lead' => $lead->load([
                'assignedUser',
                'notes.user',
                'documents'
            ]),
            'users' => User::whereRaw('is_active = true')->get(['id', 'name']),
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
     * Update the specified resource in storage.
     */
    public function update(UpdateLeadRequest $request, Lead $lead)
    {
        $validated = $request->validated();
        
        // Handle assigned user change
        if ($lead->assigned_user_id !== $validated['assigned_user_id']) {
            $validated['assigned_at'] = now();
            $validated['notification_status'] = true;
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

        // Cast boolean fields before update
        if (isset($validated['notification_status'])) {
            $validated['notification_status'] = (bool)$validated['notification_status'];
        }

        $lead->update($validated);

        // Broadcast the event
        event(new LeadUpdated($lead));

        return redirect()->back()->with('success', 'Lead updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Lead $lead)
    {
        try {
            $lead->delete();
            return redirect()->back()->with('success', 'Lead deleted successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Failed to delete lead']);
        }
    }

    public function bulkUpload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv'
        ]);

        try {
            DB::beginTransaction();
            
            $import = new LeadsImport;
            Excel::import($import, $request->file('file'));

            // Get the imported leads and broadcast events
            $importedLeads = $import->getImportedLeads();
            foreach ($importedLeads as $lead) {
                event(new LeadCreated($lead));
            }
            
            DB::commit();
            
            $message = 'Leads imported successfully';
            if ($import->getSkippedCount() > 0) {
                $message .= '. ' . $import->getSkippedCount() . ' leads were skipped due to duplicate phone/email.';
            }
            
            return back()->with('success', $message);
        } catch (\Exception $e) {
            // ... rest of your error handling ...
        }
    }

    public function downloadTemplate()
    {
        $headers = [
            'Content-Type' => 'application/vnd.ms-excel',
            'Content-Disposition' => 'attachment; filename="leads-template.xlsx"'
        ];

        return response()->download(
            storage_path('app/templates/leads-template.xlsx'),
            'leads-template.xlsx',
            $headers
        );
    }
}
