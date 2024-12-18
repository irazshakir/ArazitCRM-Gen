<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\User;

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
                $query->where('lead_active_status = ?', [$request->lead_active_status === '1']);
            });

        $activeLeads = (clone $baseQuery)
            ->whereRaw('lead_active_status =  true')
            ->count();

        $leadsCreated = (clone $baseQuery)
            ->whereBetween('created_at', [$startDate, $endDate])
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
                    'icon' => 'UserGroupIcon'
                ],
                'leads_created' => [
                    'value' => $leadsCreated,
                    'change' => $this->calculateCreatedGrowth($startDate, $endDate),
                    'icon' => 'DocumentPlusIcon'
                ],
                'leads_assigned' => [
                    'value' => $leadsAssigned,
                    'change' => $this->calculateAssignedGrowth($startDate, $endDate),
                    'icon' => 'UserPlusIcon'
                ],
                'leads_closed' => [
                    'value' => $leadsClosed,
                    'change' => $this->calculateClosedGrowth($startDate, $endDate),
                    'icon' => 'ArchiveBoxXMarkIcon'
                ],
                'followup_required' => [
                    'value' => $followupRequired,
                    'change' => $this->calculateFollowupGrowth(),
                    'icon' => 'BellAlertIcon'
                ]
            ],
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
            'type' => $change >= 0 ? 'negative' : 'positive' // Inverse because growth in non-potential is negative
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
            'type' => $change >= 0 ? 'negative' : 'positive' // Inverse because growth in lost leads is negative
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
}
