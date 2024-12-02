<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Lead;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $year = $request->input('year', Carbon::now()->year);
        $startDate = Carbon::create($year)->startOfYear();
        $endDate = Carbon::create($year)->endOfYear();

        // Total Leads
        $totalLeads = Lead::whereBetween('created_at', [$startDate, $endDate])->count();

        // Active Leads
        $activeLeads = Lead::where('lead_active_status', true)->count();

        // Conversion Ratio
        $wonLeads = Lead::where('lead_status', 'Won')
            ->whereBetween('won_at', [$startDate, $endDate])
            ->count();
        $conversionRatio = $totalLeads > 0 
            ? round(($wonLeads / $totalLeads) * 100, 2)
            : 0;

        // Followup Required
        $followupRequired = Lead::where('lead_active_status', true)
            ->whereDate('followup_date', '<', Carbon::now())
            ->count();

        return Inertia::render('Dashboard', [
            'stats' => [
                'totalLeads' => $totalLeads,
                'activeLeads' => $activeLeads,
                'conversionRatio' => $conversionRatio,
                'followupRequired' => $followupRequired
            ]
        ]);
    }
}
