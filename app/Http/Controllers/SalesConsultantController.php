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
            \Log::info('Request parameters:', [
                'show_overdue' => $request->show_overdue,
                'all_parameters' => $request->all()
            ]);

            $query = Lead::query()
                ->with(['product', 'assignedUser'])
                ->where('assigned_user_id', auth()->id())
                ->when($request->search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
                })
                ->when($request->lead_status, function ($query, $statuses) {
                    $query->whereIn('lead_status', $statuses);
                })
                ->when($request->lead_source, function ($query, $sources) {
                    $query->whereIn('lead_source', $sources);
                })
                ->when($request->product_id, function ($query, $productId) {
                    $query->where('product_id', $productId);
                })
                ->when($request->notification_status !== null, function ($query) use ($request) {
                    $query->whereRaw('notification_status = ?', [($request->notification_status === '1') ? 'true' : 'false']);
                })
                ->when($request->show_overdue == true, function ($query) {
                    // Set timezone to Pacific Time
                    $now = now()->setTimezone('America/Los_Angeles');
                    $currentDate = $now->format('Y-m-d');
                    
                    \Log::info('Filtering overdue leads', [
                        'current_date' => $currentDate,
                        'current_time' => $now->format('g:i A'),
                        'timezone' => $now->tzName
                    ]);

                    return $query->where(function ($q) use ($currentDate, $now) {
                        // Past dates
                        $q->where(function ($dateCheck) use ($currentDate) {
                            $dateCheck->whereDate('followup_date', '<', $currentDate)
                                ->whereRaw('lead_active_status = true') // Fix boolean comparison
                                ->whereNotIn('lead_status', ['Won', 'Lost']);
                        });

                        // Same day, check time
                        $q->orWhere(function ($sameDay) use ($currentDate, $now) {
                            $sameDay->whereDate('followup_date', '=', $currentDate)
                                ->whereRaw('lead_active_status = true') // Fix boolean comparison
                                ->whereNotIn('lead_status', ['Won', 'Lost'])
                                ->where(function ($timeCheck) use ($now) {
                                    // Convert followup time to minutes since midnight for comparison
                                    $currentMinutes = $now->hour * 60 + $now->minute;
                                    
                                    $timeCheck->whereRaw("
                                        (
                                            -- Convert AM/PM time to 24-hour for comparison
                                            (CASE 
                                                WHEN followup_period = 'AM' AND CAST(followup_hour AS INTEGER) = 12 
                                                    THEN 0 
                                                WHEN followup_period = 'AM' 
                                                    THEN CAST(followup_hour AS INTEGER)
                                                WHEN followup_period = 'PM' AND CAST(followup_hour AS INTEGER) = 12 
                                                    THEN 12
                                                ELSE CAST(followup_hour AS INTEGER) + 12 
                                            END) * 60 + CAST(followup_minute AS INTEGER)
                                        ) < ?
                                    ", [$currentMinutes]);
                                });
                        });
                    })
                    ->whereNotNull('followup_date')
                    ->whereNotNull('followup_hour')
                    ->whereNotNull('followup_minute')
                    ->whereNotNull('followup_period');
                });

            // Log the generated SQL query
            \Log::info('Generated SQL:', [
                'sql' => $query->toSql(),
                'bindings' => $query->getBindings()
            ]);

            $leads = $query
                ->orderByDesc('lead_active_status')
                ->orderBy('followup_date')
                ->orderBy(DB::raw("CASE 
                    WHEN followup_period = 'AM' THEN 1 
                    WHEN followup_period = 'PM' THEN 2 
                    ELSE 3 
                END"))
                ->orderBy('followup_hour')
                ->orderBy('followup_minute')
                ->paginate($request->per_page ?? 10)
                ->withQueryString();

            return inertia('SalesConsultant/SCLeadIndex', [
                'leads' => $leads,
                'leadConstants' => [
                    'statuses' => Lead::STATUSES,
                    'sources' => Lead::LEAD_SOURCES,
                    'cities' => Lead::CITIES,
                ],
                'filters' => $request->only([
                    'search',
                    'lead_status',
                    'lead_source',
                    'followup_filter',
                    'lead_active_status',
                    'product_id',
                    'notification_status',
                    'per_page',
                    'followup_date_range',
                    'show_overdue'
                ]),
                'products' => Product::whereRaw('active_status = true')
                    ->orderBy('name')
                    ->get(['id', 'name']),
                'users' => UserModel::where('role', 'sales-consultant')
                    ->orderBy('name')
                    ->get(['id', 'name'])
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in leads index:', [
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

        // Handle active status change and closed_at date
        if (isset($validated['lead_active_status'])) {
            // Convert string 'true'/'false' to boolean
            $isActive = $validated['lead_active_status'] === 'true';
            
            // Update closed_at based on active status
            if (!$isActive) {
                $validated['closed_at'] = now();
            } else {
                $validated['closed_at'] = null;
            }

            // Use DB::raw for PostgreSQL boolean
            $validated['lead_active_status'] = DB::raw($isActive ? 'true' : 'false');
        }

        // Update the lead with the validated data
        DB::table('leads')
            ->where('id', $lead->id)
            ->update(array_map(function ($value) {
                return $value instanceof \Illuminate\Database\Query\Expression ? $value : $value;
            }, $validated));

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
