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
                ->where('assigned_user_id', auth()->id());

            if ($request->search) {
                $query->where(function ($q) use ($request) {
                    $q->where('name', 'like', "%{$request->search}%")
                        ->orWhere('phone', 'like', "%{$request->search}%")
                        ->orWhere('email', 'like', "%{$request->search}%");
                });
            }

            if ($request->lead_status) {
                $query->whereIn('lead_status', $request->lead_status);
            }

            if ($request->lead_source) {
                $query->whereIn('lead_source', $request->lead_source);
            }

            if ($request->product_id) {
                $query->where('product_id', $request->product_id);
            }

            if ($request->lead_active_status !== null) {
                $isActive = $request->lead_active_status === 'true';
                $query->whereRaw('lead_active_status = ?', [$isActive ? 'true' : 'false']);
            }

            if ($request->notification_status !== null) {
                $isNotified = $request->notification_status === 'true';
                $query->whereRaw('notification_status = ?', [$isNotified ? 'true' : 'false']);
            }

            if ($request->followup_date_range && is_array($request->followup_date_range) && count($request->followup_date_range) === 2) {
                $query->whereDate('followup_date', '>=', $request->followup_date_range[0])
                      ->whereDate('followup_date', '<=', $request->followup_date_range[1]);
            }

            if ($request->show_overdue === 'true') {
                $currentDate = now()->format('Y-m-d');
                $query->whereRaw('lead_active_status = true')
                      ->whereDate('followup_date', '<', $currentDate);
            }

            $perPage = $request->input('per_page', 10);
            
            // Updated sorting logic
            $query->orderBy('lead_active_status', 'desc') // Active leads first
                  ->orderByRaw('
                    CASE 
                        WHEN followup_date < CURRENT_DATE THEN 1
                        ELSE 2 
                    END,
                    CASE 
                        WHEN followup_date >= CURRENT_DATE THEN followup_date
                        ELSE NULL 
                    END ASC,
                    CASE 
                        WHEN followup_date < CURRENT_DATE THEN followup_date
                        ELSE NULL 
                    END DESC
                  ') // Sort dates: overdue desc, future asc
                  ->orderByRaw('
                    CASE 
                        WHEN followup_date = CURRENT_DATE THEN 
                            (CAST(followup_hour AS INTEGER) + 
                            CASE 
                                WHEN followup_period = \'PM\' AND followup_hour != \'12\' THEN 12 
                                WHEN followup_period = \'AM\' AND followup_hour = \'12\' THEN 0 
                                ELSE 0 
                            END) * 60 + CAST(followup_minute AS INTEGER)
                    END ASC
                  '); // Sort by time for same day

            $leads = $query->paginate($perPage);

            return Inertia::render('SalesConsultant/SCLeadIndex', [
                'leads' => $leads,
                'filters' => $request->all(['search', 'lead_status', 'lead_source', 'show_overdue', 'product_id', 'lead_active_status', 'notification_status', 'followup_date_range']),
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
            
            // Set default values for required fields
            $validated = array_merge([
                'city' => 'Others',
                'lead_source' => 'Facebook',
                'lead_status' => 'Query',
                'created_by' => auth()->id(),
                'assigned_user_id' => auth()->id(),
            ], $validated);

            // Handle followup date formatting
            if (isset($validated['followup_date'])) {
                $validated['followup_date'] = Carbon::parse($validated['followup_date'])->format('Y-m-d');
            }

            // Generate email from phone if not provided
            if (empty($validated['email'])) {
                $cleanPhone = preg_replace('/[^0-9]/', '', $validated['phone']);
                $validated['email'] = $cleanPhone . '@test.com';
            }

            // Create the lead with proper boolean handling for PostgreSQL
            $lead = new Lead();
            $lead->fill(array_diff_key($validated, ['lead_active_status' => 1, 'notification_status' => 1]));
            
            // Set boolean fields using DB::raw for PostgreSQL
            $lead->lead_active_status = DB::raw('true');
            $lead->notification_status = DB::raw('false');
            
            $lead->save();

            // Log lead creation
            LeadActivityLog::create([
                'lead_id' => $lead->id,
                'user_id' => auth()->id(),
                'activity_type' => 'field_updated',
                'activity_details' => [
                    'action' => 'created',
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
            return redirect()->back()->with('error', 'Failed to create lead: ' . $e->getMessage());
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

        // Update notification status if the assigned user is viewing the lead
        if (auth()->id() === $lead->assigned_user_id && !$lead->notification_status) {
            // Use DB::raw for boolean value
            $lead->notification_status = DB::raw('true');
            $lead->save();
            
            // Log the activity
            LeadActivityLog::create([
                'lead_id' => $lead->id,
                'user_id' => auth()->id(),
                'activity_type' => 'field_updated',
                'activity_details' => [
                    'action' => 'notification_viewed',
                    'field' => 'notification_status',
                    'old_value' => false,
                    'new_value' => true,
                    'viewed_by' => auth()->user()->name
                ]
            ]);
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
            'can' => [
                'edit' => auth()->user()->can('update', $lead),
                'delete' => auth()->user()->can('delete', $lead),
            ],
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

            $validated = $request->validated();

            // Check if lead is being reassigned to a different user
            $isReassigned = isset($validated['assigned_user_id']) && 
                           $validated['assigned_user_id'] != $lead->assigned_user_id;

            if ($isReassigned) {
                // Reset notification status when lead is reassigned
                $validated['notification_status'] = DB::raw('false');
                
                // Log the reassignment
                LeadActivityLog::create([
                    'lead_id' => $lead->id,
                    'user_id' => auth()->id(),
                    'activity_type' => 'field_updated',
                    'activity_details' => [
                        'action' => 'lead_reassigned',
                        'field' => 'assigned_user_id',
                        'old_value' => UserModel::find($lead->assigned_user_id)->name,
                        'new_value' => UserModel::find($validated['assigned_user_id'])->name,
                        'changed_by' => auth()->user()->name
                    ]
                ]);
            }

            // Handle followup date formatting
            if (isset($validated['followup_date'])) {
                $validated['followup_date'] = Carbon::parse($validated['followup_date'])->format('Y-m-d');
            }

            // Update the lead
            $lead->update($validated);

            DB::commit();
            return redirect()->back()->with('success', 'Lead updated successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lead update error: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to update lead: ' . $e->getMessage());
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
            $query->whereRaw('lead_active_status IS ' . ($request->is_active ? 'TRUE' : 'FALSE'));
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
                ->whereRaw('lead_active_status IS FALSE')
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
                    DB::raw("COUNT(CASE WHEN lead_active_status IS FALSE AND closed_at IS NOT NULL THEN 1 END) as closed"),
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
