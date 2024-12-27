<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\User;
use App\Models\Product;

class ReportController extends Controller
{
    public function leadsReport(Request $request)
    {
        $startDate = $request->input('start_date') 
            ? Carbon::parse($request->input('start_date'))->startOfDay()
            : Carbon::now()->startOfMonth();
        
        $endDate = $request->input('end_date')
            ? Carbon::parse($request->input('end_date'))->endOfDay()
            : Carbon::now()->endOfMonth();

        $baseQuery = Lead::query()
            ->when($request->user_id, function ($query, $userId) {
                $query->where('assigned_user_id', $userId);
            })
            ->when($request->lead_status, function ($query, $status) {
                $query->where('lead_status', $status);
            })
            ->when($request->lead_active_status !== null, function ($query) use ($request) {
                $query->whereRaw('lead_active_status = ?', [$request->lead_active_status === '1']);
            });

        $activeLeads = (clone $baseQuery)
            ->whereRaw('lead_active_status =  true')
            ->count();

        $leadsCreated = (clone $baseQuery)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        // Get user-wise leads handled stats (one activity per lead per day)
        $handledLeadsUserWise = DB::table('lead_activity_logs AS lal')
            ->join('users', 'lal.user_id', '=', 'users.id')
            ->whereBetween('lal.created_at', [$startDate, $endDate])
            ->when($request->user_id, function ($query, $userId) {
                $query->where('lal.user_id', $userId);
            })
            ->select(
                'users.name',
                DB::raw('COUNT(DISTINCT CONCAT(lal.lead_id, DATE(lal.created_at))) as total_handled')
            )
            ->groupBy('users.id', 'users.name')
            ->get();

        // Get total leads handled (unique leads per day across all users)
        $totalHandledLeads = DB::table('lead_activity_logs')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->when($request->user_id, function ($query, $userId) {
                $query->where('user_id', $userId);
            })
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

        $leadsAssigned = (clone $baseQuery)
            ->whereNotNull('assigned_at')
            ->whereBetween('assigned_at', [$startDate, $endDate])
            ->count();

        $leadsClosed = (clone $baseQuery)
            ->whereNotNull('closed_at')
            ->whereBetween('closed_at', [$startDate, $endDate])
            ->count();

        $followupRequired = (clone $baseQuery)
            ->where('followup_date', '<', Carbon::today())
            ->whereRaw('lead_active_status = true')
            ->count();

        // Add Won Leads Statistics with debugging
        $wonLeadsQuery = Lead::query()
            ->where('lead_status', 'Won')
            ->when($request->user_id, function ($query, $userId) {
                $query->where('assigned_user_id', $userId);
            })
            ->whereBetween('won_at', [$startDate, $endDate]);
            
        // Debug information
        \Log::info('Won Leads Query Debug:', [
            'start_date' => $startDate->toDateTimeString(),
            'end_date' => $endDate->toDateTimeString(),
            'sql' => $wonLeadsQuery->toSql(),
            'bindings' => $wonLeadsQuery->getBindings(),
            'results' => $wonLeadsQuery->get()->toArray()
        ]);

        $wonLeads = $wonLeadsQuery->count();

        $wonLeadsUserWise = Lead::select(
            'users.name',
            DB::raw('COUNT(*) as total_won')
        )
            ->join('users', 'leads.assigned_user_id', '=', 'users.id')
            ->where('lead_status', 'Won')
            ->whereBetween('won_at', [$startDate, $endDate])
            ->groupBy('users.id', 'users.name')
            ->get();

        $userWiseStats = Lead::select(
            'users.name',
            DB::raw('COUNT(*) as total'),
            DB::raw('SUM(CASE WHEN lead_active_status = true THEN 1 ELSE 0 END) as active_leads'),
            DB::raw('SUM(CASE WHEN assigned_at BETWEEN ? AND ? AND assigned_user_id = users.id THEN 1 ELSE 0 END) as assigned_leads'),
            DB::raw('SUM(CASE WHEN closed_at BETWEEN ? AND ? AND assigned_user_id = users.id THEN 1 ELSE 0 END) as closed_leads'),
            DB::raw('SUM(CASE WHEN followup_date < CURRENT_DATE AND lead_active_status = true AND assigned_user_id = users.id THEN 1 ELSE 0 END) as followup_required')
        )
            ->join('users', 'leads.assigned_user_id', '=', 'users.id')
            ->groupBy('users.id', 'users.name')
            ->setBindings([$startDate, $endDate, $startDate, $endDate])
            ->get();

            $monthlyTrends = DB::table('leads')
                ->select([
                    DB::raw("date_trunc('month', created_at) as month"),
                    DB::raw("COUNT(DISTINCT CASE WHEN created_at BETWEEN '" . $startDate . "' AND '" . $endDate . "' THEN leads.id END) as created"),
                    DB::raw("COUNT(DISTINCT CASE WHEN closed_at BETWEEN '" . $startDate . "' AND '" . $endDate . "' THEN leads.id END) as closed")
                ])
                ->when($request->user_id, function ($query, $userId) {
                    $query->where('assigned_user_id', $userId);
                })
                ->when($request->lead_status, function ($query, $status) {
                    $query->where('lead_status', $status);
                })
                ->when($request->lead_active_status !== null, function ($query) use ($request) {
                    $query->whereRaw('lead_active_status = ?', [$request->lead_active_status === '1']);
                })
                ->whereBetween('created_at', [$startDate, $endDate])
                ->groupBy(DB::raw("date_trunc('month', created_at)"))
                ->orderBy('month')
                ->get()
                ->map(function ($item) {
                    return [
                        'name' => Carbon::parse($item->month)->format('M Y'),
                        'Created' => (int)$item->created,
                        'Closed' => (int)$item->closed
                    ];
                });
                

        
        return Inertia::render('Reports/LeadsReport', [
            'stats' => [
                'active_leads' => [
                    'value' => $activeLeads,
                    'change' => $this->calculateActiveGrowth(),
                ],
                'leads_created' => [
                    'value' => $leadsCreated,
                    'change' => $this->calculateCreatedGrowth($startDate, $endDate),
                ],
                'leads_handled' => [
                    'value' => $totalHandledLeads,
                    'change' => $this->calculateHandledGrowth($startDate, $endDate),
                ],
                'won_leads' => [
                    'value' => $wonLeads,
                    'change' => $this->calculateWonGrowth($startDate, $endDate),
                ],
                'followup_required' => [
                    'value' => $followupRequired,
                    'change' => $this->calculateFollowupGrowth(),
                ]
            ],
            'wonLeadsUserWise' => $wonLeadsUserWise,
            'createdLeadsUserWise' => Lead::select(
                'users.name',
                DB::raw('COUNT(*) as total_created')
            )
                ->join('users', 'leads.created_by', '=', 'users.id')
                ->whereBetween('leads.created_at', [$startDate, $endDate])
                ->when($request->user_id, function ($query, $userId) {
                    $query->where('created_by', $userId);
                })
                ->groupBy('users.id', 'users.name')
                ->get(),
            'handledLeadsUserWise' => $handledLeadsUserWise,
            'userWiseStats' => $userWiseStats,
            'statusWiseStats' => Lead::select('lead_status', DB::raw('COUNT(*) as total'))
                ->groupBy('lead_status')
                ->get(),
            'monthlyTrends' => $monthlyTrends,
            'users' => User::select('id', 'name')->get(),
            'leadStatuses' => Lead::distinct()->pluck('lead_status'),
            'filters' => $request->only([
                'user_id',
                'lead_status',
                'lead_active_status',
                'start_date',
                'end_date'
            ])
        ]);
    }

    private function calculateActiveGrowth()
    {
        $currentMonth = [now()->startOfMonth(), now()->endOfMonth()];
        $lastMonth = [now()->subMonth()->startOfMonth(), now()->subMonth()->endOfMonth()];

        $current = Lead::whereRaw('lead_active_status = true')->count();
        $previous = Lead::whereRaw('lead_active_status = true')
            ->whereDate('created_at', '<', $currentMonth[0])
            ->count();

        if ($previous == 0) return ['percentage' => 0, 'type' => 'neutral'];

        $change = (($current - $previous) / $previous) * 100;
        return [
            'percentage' => round($change, 2),
            'type' => $change >= 0 ? 'positive' : 'negative'
        ];
    }

    private function calculateCreatedGrowth($currentStartDate, $currentEndDate)
    {
        $daysDiff = $currentStartDate->diffInDays($currentEndDate);
        $previousStartDate = $currentStartDate->copy()->subDays($daysDiff + 1);
        $previousEndDate = $currentStartDate->copy()->subDay();

        $current = Lead::whereBetween('created_at', [$currentStartDate, $currentEndDate])->count();
        $previous = Lead::whereBetween('created_at', [$previousStartDate, $previousEndDate])->count();

        if ($previous == 0) return ['percentage' => 0, 'type' => 'neutral'];

        $change = (($current - $previous) / $previous) * 100;
        return [
            'percentage' => round($change, 2),
            'type' => $change >= 0 ? 'positive' : 'negative'
        ];
    }

    private function calculateAssignedGrowth($currentStartDate, $currentEndDate)
    {
        $daysDiff = $currentStartDate->diffInDays($currentEndDate);
        $previousStartDate = $currentStartDate->copy()->subDays($daysDiff + 1);
        $previousEndDate = $currentStartDate->copy()->subDay();

        $current = Lead::whereBetween('assigned_at', [$currentStartDate, $currentEndDate])->count();
        $previous = Lead::whereBetween('assigned_at', [$previousStartDate, $previousEndDate])->count();

        if ($previous == 0) return ['percentage' => 0, 'type' => 'neutral'];

        $change = (($current - $previous) / $previous) * 100;
        return [
            'percentage' => round($change, 2),
            'type' => $change >= 0 ? 'positive' : 'negative'
        ];
    }

    private function calculateClosedGrowth($currentStartDate, $currentEndDate)
    {
        $daysDiff = $currentStartDate->diffInDays($currentEndDate);
        $previousStartDate = $currentStartDate->copy()->subDays($daysDiff + 1);
        $previousEndDate = $currentStartDate->copy()->subDay();

        $current = Lead::whereBetween('closed_at', [$currentStartDate, $currentEndDate])->count();
        $previous = Lead::whereBetween('closed_at', [$previousStartDate, $previousEndDate])->count();

        if ($previous == 0) return ['percentage' => 0, 'type' => 'neutral'];

        $change = (($current - $previous) / $previous) * 100;
        return [
            'percentage' => round($change, 2),
            'type' => $change >= 0 ? 'positive' : 'negative'
        ];
    }

    private function calculateFollowupGrowth()
    {
        $current = Lead::where('followup_date', '<', today())
            ->whereRaw('lead_active_status = true')
            ->count();

        $previous = Lead::where('followup_date', '<', today()->subMonth())
            ->whereRaw('lead_active_status = true')
            ->count();

        if ($previous == 0) return ['percentage' => 0, 'type' => 'neutral'];

        $change = (($current - $previous) / $previous) * 100;
        return [
            'percentage' => round($change, 2),
            'type' => $change >= 0 ? 'negative' : 'positive'
        ];
    }

    private function calculateWonGrowth($currentStartDate, $currentEndDate)
    {
        $daysDiff = $currentStartDate->diffInDays($currentEndDate);
        $previousStartDate = $currentStartDate->copy()->subDays($daysDiff + 1);
        $previousEndDate = $currentStartDate->copy()->subDay();

        $current = Lead::where('lead_status', 'Won')
            ->whereBetween('won_at', [$currentStartDate, $currentEndDate])
            ->count();

        $previous = Lead::where('lead_status', 'Won')
            ->whereBetween('won_at', [$previousStartDate, $previousEndDate])
            ->count();

        if ($previous == 0) return ['percentage' => 0, 'type' => 'neutral'];

        $change = (($current - $previous) / $previous) * 100;
        return [
            'percentage' => round($change, 2),
            'type' => $change >= 0 ? 'positive' : 'negative'
        ];
    }

    private function calculateHandledGrowth($currentStartDate, $currentEndDate)
    {
        $daysDiff = $currentStartDate->diffInDays($currentEndDate);
        $previousStartDate = $currentStartDate->copy()->subDays($daysDiff + 1);
        $previousEndDate = $currentStartDate->copy()->subDay();

        $current = DB::table('lead_activity_logs')
            ->whereBetween('created_at', [$currentStartDate, $currentEndDate])
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

        $previous = DB::table('lead_activity_logs')
            ->whereBetween('created_at', [$previousStartDate, $previousEndDate])
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

        if ($previous == 0) return ['percentage' => 0, 'type' => 'neutral'];

        $change = (($current - $previous) / $previous) * 100;
        return [
            'percentage' => round($change, 2),
            'type' => $change >= 0 ? 'positive' : 'negative'
        ];
    }

    public function salesReport(Request $request)
    {
        $startDate = $request->input('start_date') 
            ? Carbon::parse($request->input('start_date'))->startOfDay()
            : Carbon::now()->startOfMonth();
        
        $endDate = $request->input('end_date')
            ? Carbon::parse($request->input('end_date'))->endOfDay()
            : Carbon::now()->endOfMonth();

        $baseQuery = Lead::query()
            ->when($request->user_id, function ($query, $userId) {
                $query->where('assigned_user_id', $userId);
            });

        // Total Sales (Won Leads)
        $totalSales = (clone $baseQuery)
            ->where('lead_status', 'Won')
            ->whereBetween('won_at', [$startDate, $endDate])
            ->count();

        // Conversion Ratio
        $totalLeads = (clone $baseQuery)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();
        
        $conversionRatio = $totalLeads > 0 
            ? round(($totalSales / $totalLeads) * 100, 2)
            : 0;

        // Non-Potential Leads
        $nonPotentialLeads = (clone $baseQuery)
            ->where('lead_status', 'Non-Potential')
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->count();

        // Lost Clients
        $lostClients = (clone $baseQuery)
            ->where('lead_status', 'Lost')
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->count();

        // User-wise stats
        $userWiseStats = Lead::select(
            'users.name',
            DB::raw("COUNT(DISTINCT CASE WHEN leads.lead_status = 'Won' AND leads.won_at BETWEEN ? AND ? THEN leads.id END) as total_sales"),
            DB::raw("ROUND(COUNT(DISTINCT CASE WHEN leads.lead_status = 'Won' AND leads.won_at BETWEEN ? AND ? THEN leads.id END) * 100.0 / NULLIF(COUNT(DISTINCT CASE WHEN leads.created_at BETWEEN ? AND ? THEN leads.id END), 0), 2) as conversion_ratio"),
            DB::raw("COUNT(DISTINCT CASE WHEN leads.lead_status = 'Non-Potential' AND leads.updated_at BETWEEN ? AND ? THEN leads.id END) as non_potential_leads"),
            DB::raw("COUNT(DISTINCT CASE WHEN leads.lead_status = 'Lost' AND leads.updated_at BETWEEN ? AND ? THEN leads.id END) as lost_leads")
        )
            ->join('users', 'leads.assigned_user_id', '=', 'users.id')
            ->groupBy('users.id', 'users.name')
            ->setBindings([
                $startDate, $endDate,  // for total_sales
                $startDate, $endDate,  // for won_at in conversion_ratio
                $startDate, $endDate,  // for created_at in conversion_ratio
                $startDate, $endDate,  // for non_potential_leads
                $startDate, $endDate   // for lost_leads
            ])
            ->get();

        // Conversion Trends
        $conversionTrends = DB::table('leads')
            ->select([
                DB::raw("date_trunc('month', created_at) as month"),
                DB::raw('COUNT(DISTINCT CASE WHEN assigned_at IS NOT NULL THEN id END) as assigned_leads'),
                DB::raw('ROUND(COUNT(DISTINCT CASE WHEN lead_status = \'Won\' THEN id END) * 100.0 / NULLIF(COUNT(DISTINCT id), 0), 2) as conversion_ratio')
            ])
            ->when($request->user_id, function ($query, $userId) {
                $query->where('assigned_user_id', $userId);
            })
            ->whereBetween('created_at', [$startDate, $endDate])
            ->groupBy(DB::raw("date_trunc('month', created_at)"))
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => Carbon::parse($item->month)->format('M Y'),
                    'assigned_leads' => (int)$item->assigned_leads,
                    'conversion_ratio' => (float)$item->conversion_ratio
                ];
            });

        return Inertia::render('Reports/SalesReport', [
            'stats' => [
                'total_sales' => [
                    'value' => $totalSales,
                    'change' => $this->calculateSalesGrowth($startDate, $endDate)
                ],
                'conversion_ratio' => [
                    'value' => $conversionRatio,
                    'change' => $this->calculateConversionGrowth($startDate, $endDate)
                ],
                'non_potential' => [
                    'value' => $nonPotentialLeads,
                    'change' => $this->calculateNonPotentialGrowth($startDate, $endDate)
                ],
                'client_lost' => [
                    'value' => $lostClients,
                    'change' => $this->calculateLostGrowth($startDate, $endDate)
                ]
            ],
            'userWiseStats' => $userWiseStats,
            'conversionTrends' => $conversionTrends,
            'users' => User::select('id', 'name')->get()
        ]);
    }

    private function calculateSalesGrowth($currentStartDate, $currentEndDate)
    {
        $daysDiff = $currentStartDate->diffInDays($currentEndDate);
        $previousStartDate = $currentStartDate->copy()->subDays($daysDiff + 1);
        $previousEndDate = $currentStartDate->copy()->subDay();

        $current = Lead::where('lead_status', 'Won')
            ->whereBetween('won_at', [$currentStartDate, $currentEndDate])
            ->count();

        $previous = Lead::where('lead_status', 'Won')
            ->whereBetween('won_at', [$previousStartDate, $previousEndDate])
            ->count();

        if ($previous == 0) return ['percentage' => 0, 'type' => 'neutral'];

        $change = (($current - $previous) / $previous) * 100;
        return [
            'percentage' => round($change, 2),
            'type' => $change >= 0 ? 'positive' : 'negative'
        ];
    }

    private function calculateConversionGrowth($currentStartDate, $currentEndDate)
    {
        $daysDiff = $currentStartDate->diffInDays($currentEndDate);
        $previousStartDate = $currentStartDate->copy()->subDays($daysDiff + 1);
        $previousEndDate = $currentStartDate->copy()->subDay();

        // Current period
        $currentWon = Lead::where('lead_status', 'Won')
            ->whereBetween('won_at', [$currentStartDate, $currentEndDate])
            ->count();
        $currentTotal = Lead::whereBetween('created_at', [$currentStartDate, $currentEndDate])
            ->count();
        $currentRatio = $currentTotal > 0 ? ($currentWon / $currentTotal) * 100 : 0;

        // Previous period
        $previousWon = Lead::where('lead_status', 'Won')
            ->whereBetween('won_at', [$previousStartDate, $previousEndDate])
            ->count();
        $previousTotal = Lead::whereBetween('created_at', [$previousStartDate, $previousEndDate])
            ->count();
        $previousRatio = $previousTotal > 0 ? ($previousWon / $previousTotal) * 100 : 0;

        if ($previousRatio == 0) return ['percentage' => 0, 'type' => 'neutral'];

        $change = (($currentRatio - $previousRatio) / $previousRatio) * 100;
        return [
            'percentage' => round($change, 2),
            'type' => $change >= 0 ? 'positive' : 'negative'
        ];
    }

    private function calculateNonPotentialGrowth($currentStartDate, $currentEndDate)
    {
        $daysDiff = $currentStartDate->diffInDays($currentEndDate);
        $previousStartDate = $currentStartDate->copy()->subDays($daysDiff + 1);
        $previousEndDate = $currentStartDate->copy()->subDay();

        $current = Lead::where('lead_status', 'Non-Potential')
            ->whereBetween('updated_at', [$currentStartDate, $currentEndDate])
            ->count();

        $previous = Lead::where('lead_status', 'Non-Potential')
            ->whereBetween('updated_at', [$previousStartDate, $previousEndDate])
            ->count();

        if ($previous == 0) return ['percentage' => 0, 'type' => 'neutral'];

        $change = (($current - $previous) / $previous) * 100;
        return [
            'percentage' => round($change, 2),
            'type' => $change >= 0 ? 'negative' : 'positive'
        ];
    }

    private function calculateLostGrowth($currentStartDate, $currentEndDate)
    {
        $daysDiff = $currentStartDate->diffInDays($currentEndDate);
        $previousStartDate = $currentStartDate->copy()->subDays($daysDiff + 1);
        $previousEndDate = $currentStartDate->copy()->subDay();

        $current = Lead::where('lead_status', 'Lost')
            ->whereBetween('updated_at', [$currentStartDate, $currentEndDate])
            ->count();

        $previous = Lead::where('lead_status', 'Lost')
            ->whereBetween('updated_at', [$previousStartDate, $previousEndDate])
            ->count();

        if ($previous == 0) return ['percentage' => 0, 'type' => 'neutral'];

        $change = (($current - $previous) / $previous) * 100;
        return [
            'percentage' => round($change, 2),
            'type' => $change >= 0 ? 'negative' : 'positive'
        ];
    }

    public function marketingReport(Request $request)
    {
        $startDate = $request->input('start_date') 
            ? Carbon::parse($request->input('start_date'))->startOfDay()
            : Carbon::now()->startOfMonth();
        
        $endDate = $request->input('end_date')
            ? Carbon::parse($request->input('end_date'))->endOfDay()
            : Carbon::now()->endOfMonth();

        $leadSource = $request->input('lead_source');

        // Calculate budget spend with lead source filter
        $budgetSpendQuery = DB::table('marketing')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereBetween('start_date', [$startDate, $endDate])
            ->whereBetween('end_date', [$startDate, $endDate]);

        if ($leadSource) {
            $budgetSpendQuery->where('lead_source', $leadSource);
        }
        
        $budgetSpend = $budgetSpendQuery->sum('cost');

        // Calculate leads from marketing sources with filter
        $marketingLeadsQuery = Lead::whereIn('lead_source', [
            'Facebook', 'Instagram', 'Whatsapp', 'Google-Ads', 
            'Youtube-Ads', 'SEO', 'LinkedIn'
        ])
        ->whereBetween('created_at', [$startDate, $endDate]);

        if ($leadSource) {
            $marketingLeadsQuery->where('lead_source', $leadSource);
        }

        $marketingLeads = $marketingLeadsQuery->count();

        // Calculate cost per lead
        $costPerLead = $marketingLeads > 0 ? $budgetSpend / $marketingLeads : 0;

        // Get monthly trends with lead source filter
        $monthlyTrends = [];
        $startMonth = Carbon::parse($startDate)->startOfMonth();
        $endMonth = Carbon::parse($endDate)->endOfMonth();

        while ($startMonth->lte($endMonth)) {
            $monthStart = $startMonth->copy()->startOfMonth();
            $monthEnd = $startMonth->copy()->endOfMonth();

            $monthlyBudgetQuery = DB::table('marketing')
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->whereBetween('start_date', [$monthStart, $monthEnd])
                ->whereBetween('end_date', [$monthStart, $monthEnd]);

            if ($leadSource) {
                $monthlyBudgetQuery->where('lead_source', $leadSource);
            }

            $monthlyBudget = $monthlyBudgetQuery->sum('cost');

            $monthlyLeadsQuery = Lead::whereIn('lead_source', [
                'Facebook', 'Instagram', 'Whatsapp', 'Google-Ads', 
                'Youtube-Ads', 'SEO', 'LinkedIn'
            ])
            ->whereBetween('created_at', [$monthStart, $monthEnd]);

            if ($leadSource) {
                $monthlyLeadsQuery->where('lead_source', $leadSource);
            }

            $monthlyLeads = $monthlyLeadsQuery->count();

            $monthlyTrends[] = [
                'name' => $startMonth->format('M Y'),
                'budget_spend' => $monthlyBudget,
                'leads_created' => $monthlyLeads
            ];

            $startMonth->addMonth();
        }

        // Get unique lead sources for dropdown
        $leadSources = DB::table('marketing')
            ->distinct()
            ->pluck('lead_source');

        // Calculate growth percentages with lead source filter
        $previousStartDate = Carbon::parse($startDate)->subMonth();
        $previousEndDate = Carbon::parse($endDate)->subMonth();

        $previousBudgetQuery = DB::table('marketing')
            ->whereBetween('created_at', [$previousStartDate, $previousEndDate])
            ->whereBetween('start_date', [$previousStartDate, $previousEndDate])
            ->whereBetween('end_date', [$previousStartDate, $previousEndDate]);

        if ($leadSource) {
            $previousBudgetQuery->where('lead_source', $leadSource);
        }

        $previousBudget = $previousBudgetQuery->sum('cost');

        $budgetGrowth = $previousBudget > 0 
            ? (($budgetSpend - $previousBudget) / $previousBudget) * 100 
            : 0;

        $previousCostPerLead = $this->calculatePreviousCostPerLead(
            $previousStartDate, 
            $previousEndDate, 
            $leadSource
        );

        $costPerLeadGrowth = $previousCostPerLead > 0 
            ? (($costPerLead - $previousCostPerLead) / $previousCostPerLead) * 100 
            : 0;

        // Calculate Average Lead Cost Platform wise
        $avgLeadCostByPlatform = [];
        $platforms = DB::table('marketing')->distinct()->pluck('lead_source');

        foreach ($platforms as $platform) {
            $platformCost = DB::table('marketing')
                ->where('lead_source', $platform)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->whereBetween('start_date', [$startDate, $endDate])
                ->whereBetween('end_date', [$startDate, $endDate])
                ->sum('cost');

            $platformLeads = Lead::where('lead_source', $platform)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->count();

            if ($platformLeads > 0) {
                $avgLeadCostByPlatform[] = [
                    'name' => $platform,
                    'avg_cost' => round($platformCost / $platformLeads, 2)
                ];
            }
        }

        // Calculate Conversion Ratio Source wise
        $conversionRatioBySource = [];
        $allLeadSources = [
            'Facebook', 'Instagram', 'LinkedIn', 'Whatsapp', 
            'Google-Ads', 'Youtube-Ads', 'SEO', 'Direct-Call',
            'Twitter', 'Client-Referral', 'Personal-Referral', 'Others'
        ];

        foreach ($allLeadSources as $source) {
            $totalLeads = Lead::where('lead_source', $source)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->count();

            $wonLeads = Lead::where('lead_source', $source)
                ->where('lead_status', 'Won')
                ->whereBetween('won_at', [$startDate, $endDate])
                ->count();

            if ($totalLeads > 0) {
                $conversionRatioBySource[] = [
                    'name' => $source,
                    'conversion_ratio' => round(($wonLeads / $totalLeads) * 100, 2)
                ];
            }
        }

        return Inertia::render('Reports/MarketingReport', [
            'stats' => [
                'budget_spend' => [
                    'value' => round($budgetSpend, 2),
                    'change' => [
                        'percentage' => round($budgetGrowth, 2),
                        'type' => $budgetGrowth >= 0 ? 'positive' : 'negative'
                    ]
                ],
                'cost_per_lead' => [
                    'value' => round($costPerLead, 2),
                    'change' => [
                        'percentage' => round($costPerLeadGrowth, 2),
                        'type' => $costPerLeadGrowth >= 0 ? 'negative' : 'positive'
                    ]
                ]
            ],
            'monthlyTrends' => $monthlyTrends,
            'leadSources' => $leadSources,
            'filters' => [
                'lead_source' => $leadSource,
                'date_range' => [
                    $startDate->format('Y-m-d'),
                    $endDate->format('Y-m-d')
                ]
            ],
            'avgLeadCostByPlatform' => $avgLeadCostByPlatform,
            'conversionRatioBySource' => $conversionRatioBySource
        ]);
    }

    private function calculatePreviousCostPerLead($startDate, $endDate, $leadSource = null)
    {
        $previousBudgetQuery = DB::table('marketing')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereBetween('start_date', [$startDate, $endDate])
            ->whereBetween('end_date', [$startDate, $endDate]);

        if ($leadSource) {
            $previousBudgetQuery->where('lead_source', $leadSource);
        }

        $previousBudget = $previousBudgetQuery->sum('cost');

        $previousLeadsQuery = Lead::whereIn('lead_source', [
            'Facebook', 'Instagram', 'Whatsapp', 'Google-Ads', 
            'Youtube-Ads', 'SEO', 'LinkedIn'
        ])
        ->whereBetween('created_at', [$startDate, $endDate]);

        if ($leadSource) {
            $previousLeadsQuery->where('lead_source', $leadSource);
        }

        $previousLeads = $previousLeadsQuery->count();

        return $previousLeads > 0 ? $previousBudget / $previousLeads : 0;
    }

    public function logs(Request $request)
    {
        $startDate = $request->input('start_date') 
            ? Carbon::parse($request->input('start_date'))->startOfDay()
            : Carbon::now()->startOfMonth();
        
        $endDate = $request->input('end_date')
            ? Carbon::parse($request->input('end_date'))->endOfDay()
            : Carbon::now()->endOfMonth();

        $query = DB::table('lead_activity_logs AS lal')
            ->join('users', 'lal.user_id', '=', 'users.id')
            ->join('leads', 'lal.lead_id', '=', 'leads.id')
            ->whereBetween('lal.created_at', [$startDate, $endDate])
            ->when($request->user_id, function ($query, $userId) {
                $query->where('lal.user_id', $userId);
            });

        // Get count of unique leads handled
        $leadsHandled = (clone $query)
            ->distinct('lal.lead_id')
            ->count('lal.lead_id');

        // Get activities with lead and user details
        $activities = $query
            ->select([
                'leads.name as lead_name',
                'leads.phone',
                'lal.activity_type',
                'lal.activity_details',
                'users.name as user_name',
                'lal.created_at as timestamp',
                'lal.id'
            ])
            ->orderBy('lal.created_at', 'desc')
            ->get();

        return Inertia::render('Reports/LogReport', [
            'stats' => [
                'leads_handled' => $leadsHandled,
                'activities' => $activities
            ],
            'users' => User::select('id', 'name')->get()
        ]);
    }

    public function leads(Request $request)
    {
        $startDate = $request->start_date ? Carbon::parse($request->start_date)->startOfDay() : now()->startOfMonth();
        $endDate = $request->end_date ? Carbon::parse($request->end_date)->endOfDay() : now()->endOfMonth();

        $stats = [
            'active_leads' => $this->getActiveLeadsStats($startDate, $endDate),
            'leads_created' => $this->getLeadsCreatedStats($startDate, $endDate),
            'leads_handled' => $this->getLeadsHandledStats($startDate, $endDate),
            'leads_won' => $this->getLeadsWonStats($startDate, $endDate)
        ];

        return Inertia::render('Reports/LeadsReport', [
            'stats' => $stats,
            'monthlyTrends' => $this->getMonthlyTrends($startDate, $endDate)
        ]);
    }

    private function getActiveLeadsStats($startDate, $endDate)
    {
        // Get total active leads in the period
        $totalActive = Lead::whereBetween('created_at', [$startDate, $endDate])
            ->whereRaw('lead_active_status = true')
            ->count();

        // Get user-wise breakdown for active leads
        $userWiseStats = Lead::whereBetween('created_at', [$startDate, $endDate])
            ->whereRaw('lead_active_status = true')
            ->select('assigned_to', DB::raw('COUNT(*) as value'))
            ->groupBy('assigned_to')
            ->with('assignedTo:id,name')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->assigned_to,
                    'name' => $item->assignedTo ? $item->assignedTo->name : 'Unknown',
                    'value' => $item->value
                ];
            });

        return [
            'value' => $totalActive,
            'change' => 0,
            'userWise' => $userWiseStats
        ];
    }

    private function getLeadsCreatedStats($startDate, $endDate)
    {
        // Get total leads created in the period
        $totalLeads = Lead::whereBetween('created_at', [$startDate, $endDate])->count();

        // Get user-wise breakdown for created leads
        $userWiseStats = Lead::whereBetween('created_at', [$startDate, $endDate])
            ->select('created_by', DB::raw('COUNT(*) as value'))
            ->groupBy('created_by')
            ->with('creator:id,name')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->created_by,
                    'name' => $item->creator ? $item->creator->name : 'Unknown',
                    'value' => $item->value
                ];
            });

        return [
            'value' => $totalLeads,
            'change' => 0,
            'userWise' => $userWiseStats
        ];
    }

    private function getLeadsHandledStats($startDate, $endDate)
    {
        // Get total leads handled in the period
        $totalHandled = DB::table('lead_activity_logs')
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

        // Get user-wise breakdown for handled leads
        $userWiseStats = DB::table('lead_activity_logs as l')
            ->join('users as u', 'l.user_id', '=', 'u.id')
            ->whereBetween('l.created_at', [$startDate, $endDate])
            ->select(
                'l.user_id',
                'u.name as user_name',
                DB::raw('COUNT(DISTINCT l.lead_id) as count')
            )
            ->groupBy('l.user_id', 'u.name')
            ->get()
            ->map(function ($item) {
                return [
                    'user_id' => $item->user_id,
                    'user_name' => $item->user_name,
                    'count' => $item->count
                ];
            });

        return [
            'value' => $totalHandled,
            'change' => 0,
            'userWise' => $userWiseStats
        ];
    }

    private function getLeadsWonStats($startDate, $endDate)
    {
        // Get total won leads in the period
        $totalWon = Lead::where('lead_status', 'Won')
            ->whereBetween('won_at', [$startDate, $endDate])
            ->count();

        // Get user-wise breakdown for won leads
        $userWiseStats = Lead::where('lead_status', 'Won')
            ->whereBetween('won_at', [$startDate, $endDate])
            ->join('users', 'leads.assigned_to', '=', 'users.id')
            ->where('users.status', 'active')
            ->select(
                'users.id',
                'users.name',
                DB::raw('COUNT(*) as value')
            )
            ->groupBy('users.id', 'users.name')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'value' => $item->value
                ];
            });

        return [
            'value' => $totalWon,
            'change' => 0,
            'userWise' => $userWiseStats
        ];
    }

    private function getMonthlyTrends($startDate, $endDate)
    {
        // First, get the months we need to report on
        $months = Lead::whereBetween('created_at', [$startDate, $endDate])
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
            $leadStats = Lead::whereBetween('created_at', [$monthStart, $monthEnd])
                ->select([
                    DB::raw('COUNT(*) as created'),
                    DB::raw("COUNT(CASE WHEN lead_active_status = false AND closed_at IS NOT NULL THEN 1 END) as closed"),
                    DB::raw("COUNT(CASE WHEN lead_status = 'Won' AND won_at IS NOT NULL THEN 1 END) as won")
                ])
                ->first();

            // Get count of unique leads handled per day
            $handledLeads = DB::table('lead_activity_logs')
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
                'handled' => $handledLeads,
                'closed' => $leadStats->closed,
                'won' => $leadStats->won
            ];
        }

        return collect($trends);
    }
}
