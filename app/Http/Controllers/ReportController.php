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
                $query->where('lead_active_status', $request->lead_active_status === '1');
            });

        $activeLeads = (clone $baseQuery)
            ->where('lead_active_status', true)
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
            ->where('lead_active_status', true)
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

        $monthlyTrends = (clone $baseQuery)
            ->select(
                DB::raw('DATE_TRUNC(\'month\', created_at) as month'),
                DB::raw('COUNT(*) as Created'),
                DB::raw('COUNT(CASE WHEN closed_at IS NOT NULL THEN 1 END) as Closed')
            )
            ->whereBetween('created_at', [$startDate, $endDate])
            ->groupBy(DB::raw('DATE_TRUNC(\'month\', created_at)'))
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => Carbon::parse($item->month)->format('M Y'),
                    'Created' => (int)$item->Created,
                    'Closed' => (int)$item->Closed
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

        $current = Lead::where('lead_active_status', true)->count();
        $previous = Lead::where('lead_active_status', true)
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
            ->where('lead_active_status', true)
            ->count();

        $previous = Lead::where('followup_date', '<', today()->subMonth())
            ->where('lead_active_status', true)
            ->count();

        if ($previous == 0) return ['percentage' => 0, 'type' => 'neutral'];

        $change = (($current - $previous) / $previous) * 100;
        return [
            'percentage' => round($change, 2),
            'type' => $change >= 0 ? 'negative' : 'positive'
        ];
    }
}
