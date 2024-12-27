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
use App\Events\LeadUpdated;
use App\Http\Requests\UpdateSalesConsultantRequest;
use App\Http\Requests\StoreSalesConsultantRequest;
use App\Models\LeadActivityLog;
use App\Models\User as UserModel;
use App\Models\SalesConsultant;
use Carbon\Carbon;
use App\Traits\LogsLeadActivity;

class SalesConsultantController extends Controller
{
    use LogsLeadActivity;

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
            $data = $request->validated();
            $data['created_by'] = Auth::id();
            $data['assigned_user_id'] = Auth::id(); // Sales consultant creates leads for themselves
            $data['lead_active_status'] = true;
            $data['notification_status'] = false;

            $lead = Lead::create($data);

            // Log lead creation
            $this->logLeadActivity($lead->id, 'lead_created', [
                'name' => $lead->name,
                'email' => $lead->email,
                'phone' => $lead->phone,
                'source' => $lead->lead_source
            ]);

            // Log initial remarks if provided
            if (!empty($data['initial_remarks'])) {
                $this->logLeadActivity($lead->id, 'note_added', [
                    'note' => $data['initial_remarks']
                ]);
            }

            // Log followup schedule if provided
            if (!empty($data['followup_date'])) {
                $this->logLeadActivity($lead->id, 'followup_scheduled', [
                    'date' => $data['followup_date'],
                    'hour' => $data['followup_hour'],
                    'minute' => $data['followup_minute'],
                    'period' => $data['followup_period']
                ]);
            }

            event(new LeadCreated($lead));

            return redirect()->back()->with('success', 'Lead created successfully.');
        } catch (\Exception $e) {
            Log::error('Error creating lead: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Error creating lead. Please try again.');
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
        try {
            $data = $request->validated();
            $originalLead = $lead->toArray();
            
            // Don't allow changing the creator
            unset($data['created_by']);
            
            // Check for assignment change
            if (isset($data['assigned_user_id']) && $lead->assigned_user_id !== $data['assigned_user_id']) {
                $this->logLeadActivity($lead->id, 'lead_assigned', [
                    'from_user_id' => $lead->assigned_user_id,
                    'to_user_id' => $data['assigned_user_id']
                ]);
            }

            // Check for status change
            if (isset($data['lead_status']) && $lead->lead_status !== $data['lead_status']) {
                $this->logLeadActivity($lead->id, 'status_updated', [
                    'from_status' => $lead->lead_status,
                    'to_status' => $data['lead_status']
                ]);

                // Special handling for Won status
                if ($data['lead_status'] === 'Won') {
                    $data['won_at'] = now();
                    $this->logLeadActivity($lead->id, 'lead_won');
                }
            }

            // Check for active status change
            if (isset($data['lead_active_status'])) {
                $newActiveStatus = filter_var($data['lead_active_status'], FILTER_VALIDATE_BOOLEAN);
                if ($lead->lead_active_status !== $newActiveStatus) {
                    if (!$newActiveStatus) {
                        $data['closed_at'] = now();
                        $this->logLeadActivity($lead->id, 'lead_closed');
                    }
                }
            }

            // Check for followup changes
            if (isset($data['followup_date']) && 
                ($lead->followup_date != $data['followup_date'] ||
                $lead->followup_hour != $data['followup_hour'] ||
                $lead->followup_minute != $data['followup_minute'] ||
                $lead->followup_period != $data['followup_period'])) {
                
                $this->logLeadActivity($lead->id, 'followup_scheduled', [
                    'date' => $data['followup_date'],
                    'hour' => $data['followup_hour'],
                    'minute' => $data['followup_minute'],
                    'period' => $data['followup_period']
                ]);
            }

            // Log any other field changes
            $fieldsToTrack = ['name', 'email', 'phone', 'city', 'lead_source', 'product_id'];
            $changedFields = [];
            foreach ($fieldsToTrack as $field) {
                if (isset($data[$field]) && $lead->$field !== $data[$field]) {
                    $changedFields[$field] = [
                        'from' => $lead->$field,
                        'to' => $data[$field]
                    ];
                }
            }
            
            if (!empty($changedFields)) {
                $this->logLeadActivity($lead->id, 'field_updated', [
                    'changes' => $changedFields
                ]);
            }

            $lead->update($data);

            event(new LeadUpdated($lead));

            return redirect()->back()->with('success', 'Lead updated successfully.');
        } catch (\Exception $e) {
            Log::error('Error updating lead: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Error updating lead. Please try again.');
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(SalesConsultant $salesConsultant)
    {
        //
    }

    /**
     * Display reports for sales consultant.
     */
    public function reports(Request $request)
    {
        $user = Auth::user();
        $query = Lead::query();

        // Set default date range to current month if not provided
        $startDate = $request->start_date ? $request->start_date : now()->startOfMonth()->format('Y-m-d');
        $endDate = $request->end_date ? $request->end_date : now()->endOfMonth()->format('Y-m-d');

        // Apply date range filter
        $query->whereBetween('created_at', [$startDate, $endDate]);

        // Apply lead sources filter
        if ($request->has('lead_sources')) {
            $query->whereIn('lead_source', $request->lead_sources);
        }

        // Apply lead status filter
        if ($request->has('lead_statuses')) {
            $query->whereIn('lead_status', $request->lead_statuses);
        }

        // Apply products filter
        if ($request->has('products')) {
            $query->whereHas('products', function ($q) use ($request) {
                $q->whereIn('products.id', $request->products);
            });
        }

        // Apply active/inactive filter
        if ($request->has('is_active')) {
            $query->whereRaw('lead_active_status = ?', [$request->is_active ? 'true' : 'false']);
        }

        // Get the count of unique leads handled (counting one activity per lead per day)
        $activeLeadsCount = DB::table('lead_activity_logs')
            ->where('user_id', $user->id)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->select(
                'lead_id',
                DB::raw('DATE(created_at) as activity_date')
            )
            ->groupBy('lead_id', DB::raw('DATE(created_at)'))
            ->get()
            ->unique(function ($item) {
                return $item->lead_id;
            })
            ->count();

        // Get stats
        $stats = [
            'created_leads' => $query->clone()
                ->where('created_by', $user->id)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->count(),
            'assigned_leads' => $query->clone()
                ->where('assigned_user_id', $user->id)
                ->count(),
            'closed_leads' => $query->clone()
                ->where('assigned_user_id', $user->id)
                ->whereRaw('lead_active_status = false')
                ->whereBetween('closed_at', [$startDate, $endDate])
                ->count(),
            'won_leads' => $query->clone()
                ->where('assigned_user_id', $user->id)
                ->where('lead_status', 'Won')
                ->whereBetween('won_at', [$startDate, $endDate])
                ->count(),
            'active_leads' => $activeLeadsCount,
            'monthly_trends' => $this->getMonthlyTrends($user->id, $startDate, $endDate)
        ];

        // Get unique values for filters
        $leadSources = Lead::distinct()->pluck('lead_source');
        $leadStatuses = Lead::distinct()->pluck('lead_status');

        return Inertia::render('SalesConsultant/SCReports', [
            'stats' => $stats,
            'leadSources' => $leadSources->map(fn($source) => ['id' => $source, 'name' => $source]),
            'leadStatuses' => $leadStatuses->map(fn($status) => ['id' => $status, 'name' => $status]),
            'products' => Product::all(),
        ]);
    }

    /**
     * Get monthly trends for sales consultant.
     */
    private function getMonthlyTrends($userId, $startDate, $endDate)
    {
        // First, get the months we need to report on
        $months = Lead::where('assigned_user_id', $userId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->select(DB::raw("to_char(created_at, 'YYYY-MM') as month"))
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('month');

        // Then, for each month, get the stats
        $trends = [];
        foreach ($months as $month) {
            $monthStart = \Carbon\Carbon::createFromFormat('Y-m', $month)->startOfMonth();
            $monthEnd = \Carbon\Carbon::createFromFormat('Y-m', $month)->endOfMonth();

            // Get lead stats
            $leadStats = Lead::where('assigned_user_id', $userId)
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->select([
                    DB::raw("COUNT(CASE WHEN created_by = {$userId} THEN 1 END) as created"),
                    DB::raw('COUNT(*) as assigned'),
                    DB::raw("COUNT(CASE WHEN lead_active_status = false AND closed_at IS NOT NULL THEN 1 END) as closed"),
                    DB::raw("COUNT(CASE WHEN lead_status = 'Won' AND won_at IS NOT NULL THEN 1 END) as won")
                ])
                ->first();

            // Get count of unique leads handled per day
            $activeLeads = DB::table('lead_activity_logs')
                ->where('user_id', $userId)
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->select(
                    'lead_id',
                    DB::raw('DATE(created_at) as activity_date')
                )
                ->groupBy('lead_id', DB::raw('DATE(created_at)'))
                ->get()
                ->unique(function ($item) {
                    return $item->lead_id;
                })
                ->count();

            $trends[] = [
                'month' => $month,
                'created' => $leadStats->created,
                'assigned' => $leadStats->assigned,
                'closed' => $leadStats->closed,
                'won' => $leadStats->won,
                'active' => $activeLeads
            ];
        }

        return collect($trends);
    }
}
