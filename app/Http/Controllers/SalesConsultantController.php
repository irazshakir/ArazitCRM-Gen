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
use Illuminate\Support\Facades\Gate;

class SalesConsultantController extends Controller
{
    use LogsLeadActivity;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = Lead::query()
                ->with([
                    'product', 
                    'assignedUser',
                    'notes.user',
                    'documents.user'
                ])
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
                    $now = now()->setTimezone('America/Los_Angeles');
                    $currentDate = $now->format('Y-m-d');
                    
                    return $query->where(function ($q) use ($currentDate, $now) {
                        $q->where(function ($dateCheck) use ($currentDate) {
                            $dateCheck->whereDate('followup_date', '<', $currentDate)
                                ->whereRaw('lead_active_status = true')
                                ->whereNotIn('lead_status', ['Won', 'Lost']);
                        });

                        $q->orWhere(function ($sameDay) use ($currentDate, $now) {
                            $sameDay->whereDate('followup_date', '=', $currentDate)
                                ->whereRaw('lead_active_status = true')
                                ->whereNotIn('lead_status', ['Won', 'Lost'])
                                ->where(function ($timeCheck) use ($now) {
                                    $currentMinutes = $now->hour * 60 + $now->minute;
                                    
                                    $timeCheck->whereRaw("
                                        (
                                            (CASE 
                                                WHEN followup_period = 'AM' AND CAST(followup_hour AS INTEGER) = 12 
                                                    THEN 0 
                                                WHEN followup_period = 'AM' 
                                                    THEN CAST(followup_hour AS INTEGER)
                                                WHEN followup_period = 'PM' AND CAST(followup_hour AS INTEGER) = 12 
                                                    THEN 12
                                                ELSE CAST(followup_hour AS INTEGER) + 12 
                                            END) * 60 + CAST(followup_minute AS INTEGER)
                                        ) < ?", [$currentMinutes]
                                    );
                                });
                        });
                    });
                });

            $perPage = $request->input('per_page', 10);
            $leads = $query->latest()->paginate($perPage);

            return Inertia::render('SalesConsultant/SCLeadIndex', [
                'leads' => $leads,
                'filters' => $request->all(['search', 'lead_status', 'lead_source', 'show_overdue']),
                'leadConstants' => [
                    'sources' => Lead::LEAD_SOURCES,
                    'statuses' => Lead::STATUSES,
                ],
                'products' => Product::all(['id', 'name']),
                'users' => UserModel::whereRaw('is_active = true')
                    ->orderByRaw('CASE WHEN id = ? THEN 0 ELSE 1 END', [Auth::id()])
                    ->get(['id', 'name'])
            ]);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error fetching leads. Please try again.');
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
            DB::beginTransaction();

            $validated = $request->validated();
            
            if ($validated['followup_date']) {
                $validated['followup_date'] = Carbon::parse($validated['followup_date'])->format('Y-m-d');
            }

            $lead = Lead::create($validated);

            // Log lead creation
            LeadActivityLog::create([
                'lead_id' => $lead->id,
                'user_id' => auth()->id(),
                'activity_type' => 'lead_created',
                'activity_details' => [
                    'name' => $lead->name,
                    'email' => $lead->email,
                    'phone' => $lead->phone,
                    'lead_source' => $lead->lead_source,
                    'assigned_to' => UserModel::find($lead->assigned_user_id)->name
                ]
            ]);

            DB::commit();
            return redirect()->route('sales-consultant.leads.index')->with('success', 'Lead created successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lead creation error: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to create lead');
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
        if (!auth()->user()->can('view', $lead)) {
            abort(403, 'Unauthorized action.');
        }

        return Inertia::render('SalesConsultant/SCLeadEdit', [
            'lead' => $lead->load([
                'assignedUser', 
                'product', 
                'activityLogs' => function($query) {
                    $query->with('user')->latest();
                },
                'notes.user',
                'documents.user'
            ]),
            'users' => UserModel::where('role', 'sales-consultant')
                               ->whereRaw('is_active = true')
                               ->get(),
            'leadConstants' => [
                'STATUSES' => config('constants.lead.STATUSES'),
                'SOURCES' => config('constants.lead.SOURCES'),
                'CITIES' => config('constants.lead.CITIES'),
            ],
            'products' => Product::all(),
        ]);
    }

    /**
     * Update the specified lead.
     */
    public function update(UpdateLeadRequest $request, Lead $lead)
    {
        if (!auth()->user()->can('update', $lead)) {
            abort(403, 'Unauthorized action.');
        }

        try {
            DB::beginTransaction();

            $oldValues = $lead->getOriginal();
            $validated = $request->validated();

            // Handle followup datetime
            if ($validated['followup_date']) {
                $validated['followup_date'] = Carbon::parse($validated['followup_date'])->format('Y-m-d');
            }

            // Update the lead
            $lead->update($validated);

            // Log changes in fields
            $fieldsToTrack = [
                'name', 'email', 'phone', 'lead_source', 'lead_status', 
                'lead_active_status', 'product_id', 'assigned_user_id'
            ];

            foreach ($fieldsToTrack as $field) {
                if (isset($validated[$field]) && $validated[$field] != $oldValues[$field]) {
                    LeadActivityLog::create([
                        'lead_id' => $lead->id,
                        'user_id' => auth()->id(),
                        'activity_type' => 'field_updated',
                        'activity_details' => [
                            'field' => $field,
                            'old' => $oldValues[$field],
                            'new' => $validated[$field]
                        ]
                    ]);
                }
            }

            // Log followup changes
            if (isset($validated['followup_date']) && 
                ($validated['followup_date'] != $oldValues['followup_date'] ||
                $validated['followup_hour'] != $oldValues['followup_hour'] ||
                $validated['followup_minute'] != $oldValues['followup_minute'])) {
                
                LeadActivityLog::create([
                    'lead_id' => $lead->id,
                    'user_id' => auth()->id(),
                    'activity_type' => 'followup_scheduled',
                    'activity_details' => [
                        'old_date' => $oldValues['followup_date'],
                        'new_date' => $validated['followup_date'],
                        'old_time' => sprintf('%02d:%02d %s', 
                            $oldValues['followup_hour'], 
                            $oldValues['followup_minute'],
                            $oldValues['followup_period']
                        ),
                        'new_time' => sprintf('%02d:%02d %s', 
                            $validated['followup_hour'], 
                            $validated['followup_minute'],
                            $validated['followup_period']
                        )
                    ]
                ]);
            }

            DB::commit();
            return redirect()->back()->with('success', 'Lead updated successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lead update error: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to update lead');
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
