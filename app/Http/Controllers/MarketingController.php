<?php

namespace App\Http\Controllers;

use App\Models\Marketing;
use App\Http\Requests\StoreMarketingRequest;
use App\Http\Requests\UpdateMarketingRequest;
use Inertia\Inertia;
use Illuminate\Http\Request;

class MarketingController extends Controller
{
    public function index(Request $request)
    {
        // First query builder for main table data
        $tableQuery = Marketing::query();
        
        // Second query builder for total cost calculation
        $costQuery = Marketing::query();
        
        // Apply common filters to both queries
        $filters = function($query) use ($request) {
            if ($request->search) {
                $query->where('campaign_name', 'like', "%{$request->search}%");
            }

            if ($request->lead_source) {
                $query->where('lead_source', $request->lead_source);
            }

            // Handle date filtering
            $startDate = $request->start_date ?? now()->startOfMonth()->format('Y-m-d');
            $endDate = $request->end_date ?? now()->endOfMonth()->format('Y-m-d');
            
            $query->whereBetween('start_date', [$startDate, $endDate]);
        };

        // Apply base filters to table query
        $filters($tableQuery);

        // Only apply campaign_status filter if explicitly set in request
        if ($request->filled('campaign_status')) {
            $tableQuery->where('campaign_status', $request->boolean('campaign_status'));
        }

        // Apply filters to cost query (without status filter)
        $filters($costQuery);

        // Calculate total cost for ALL campaigns in date range
        $totalCost = $costQuery->sum('cost');

        // Get active campaigns for the dropdown only
        $activeCampaigns = Marketing::query()
            ->where('campaign_status', true)
            ->whereBetween('start_date', [
                $request->start_date ?? now()->startOfMonth()->format('Y-m-d'),
                $request->end_date ?? now()->endOfMonth()->format('Y-m-d')
            ])
            ->select('id', 'campaign_name', 'cost')
            ->get();

        // Get paginated results from main query
        $marketing = $tableQuery->latest()->paginate(10);

        return Inertia::render('Marketing/MarketingIndex', [
            'marketing' => [
                'data' => $marketing->items(),
                'meta' => [
                    'total' => $marketing->total(),
                    'per_page' => $marketing->perPage(),
                    'current_page' => $marketing->currentPage(),
                ],
            ],
            'filters' => $request->all(),
            'leadSources' => Marketing::LEAD_SOURCES,
            'totalCost' => $totalCost,
            'activeCampaigns' => $activeCampaigns
        ]);
    }

    public function create()
    {
        return Inertia::render('Marketing/MarketingCreate', [
            'leadSources' => Marketing::LEAD_SOURCES
        ]);
    }

    public function store(StoreMarketingRequest $request)
    {
        $marketing = Marketing::create($request->validated());
        return redirect()->route('marketing.index')
            ->with('success', 'Marketing campaign created successfully.');
    }

    public function edit(Marketing $marketing)
    {
        return Inertia::render('Marketing/MarketingEdit', [
            'marketing' => $marketing,
            'leadSources' => Marketing::LEAD_SOURCES
        ]);
    }

    public function update(UpdateMarketingRequest $request, Marketing $marketing)
    {
        $marketing->update($request->validated());
        return redirect()->route('marketing.index')
            ->with('success', 'Marketing campaign updated successfully.');
    }

    public function destroy(Marketing $marketing)
    {
        $marketing->delete();
        return redirect()->route('marketing.index')
            ->with('success', 'Marketing campaign deleted successfully.');
    }

    public function report(Request $request)
    {
        $query = Marketing::query();

        if ($request->date_range) {
            $dates = explode(',', $request->date_range);
            if (count($dates) === 2) {
                $query->whereBetween('start_date', [$dates[0], $dates[1]]);
            }
        }

        if ($request->lead_source) {
            $query->where('lead_source', $request->lead_source);
        }

        $marketingData = $query->get();

        // Calculate statistics
        $statistics = [
            'total_campaigns' => $marketingData->count(),
            'total_cost' => $marketingData->sum('cost'),
            'active_campaigns' => $marketingData->where('campaign_status', true)->count(),
            'source_distribution' => $marketingData->groupBy('lead_source')
                ->map(fn($group) => $group->count()),
        ];

        return Inertia::render('Reports/MarketingReport', [
            'marketingData' => $marketingData,
            'statistics' => $statistics,
            'leadSources' => Marketing::LEAD_SOURCES
        ]);
    }
}
