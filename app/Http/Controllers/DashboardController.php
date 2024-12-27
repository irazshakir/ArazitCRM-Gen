<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Lead;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $year = $request->input('year', Carbon::now()->year);
        $startDate = Carbon::create($year)->startOfYear();
        $endDate = Carbon::create($year)->endOfYear();

        // Base query depending on user role
        $query = Lead::query();
        
        // If user is sales consultant, only show their leads
        if (Auth::user()->role === 'sales-consultant') {
            $query->where('assigned_user_id', Auth::id());
        }

        // Total Leads
        $totalLeads = (clone $query)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        // Active Leads
        $activeLeads = (clone $query)
            ->whereRaw('lead_active_status = true')
            ->count();

        // Conversion Ratio
        $wonLeads = (clone $query)
            ->where('lead_status', 'Won')
            ->whereBetween('won_at', [$startDate, $endDate])
            ->count();
        $conversionRatio = $totalLeads > 0 
            ? round(($wonLeads / $totalLeads) * 100, 2)
            : 0;

        // Followup Required
        $followupRequired = (clone $query)
            ->whereRaw('lead_active_status = true')
            ->whereDate('followup_date', '<', Carbon::now())
            ->count();

        return Inertia::render('Dashboard', [
            'stats' => [
                'totalLeads' => $totalLeads,
                'activeLeads' => $activeLeads,
                'conversionRatio' => $conversionRatio,
                'followupRequired' => $followupRequired,
            ]
        ]);
    }

    public function leads(Request $request)
    {
        $query = Lead::with('assignedUser');
        
        // If user is sales consultant, only show their leads
        if (Auth::user()->role === 'sales-consultant') {
            $query->where('assigned_user_id', Auth::id());
        }

        // Filter by type
        switch ($request->type) {
            case 'active':
                // Only active leads
                $query->whereRaw('lead_active_status = true');
                break;
            case 'followup':
                // Only leads that need followup (past followup date and still active)
                $query->whereRaw('lead_active_status = true')
                      ->whereDate('followup_date', '<', Carbon::now());
                break;
            case 'total':
            default:
                // No filter - show all leads regardless of status
                break;
        }

        $leads = $query->latest()->get()->map(function ($lead) {
            $followupDateTime = null;
            if ($lead->followup_date) {
                $followupDateTime = $lead->followup_date->format('Y-m-d');
                if ($lead->followup_hour && $lead->followup_minute && $lead->followup_period) {
                    $followupDateTime .= ' ' . $lead->followup_hour . ':' . 
                                       $lead->followup_minute . ' ' . 
                                       $lead->followup_period;
                }
            }

            return [
                'id' => $lead->id,
                'name' => $lead->name,
                'phone' => $lead->phone,
                'assigned_user' => $lead->assignedUser ? [
                    'id' => $lead->assignedUser->id,
                    'name' => $lead->assignedUser->name,
                ] : null,
                'followup_date' => $followupDateTime,
                'lead_status' => $lead->lead_status,
                'lead_active_status' => $lead->lead_active_status,
                'email' => $lead->email,
                'city' => $lead->city,
                'lead_source' => $lead->lead_source,
                'created_at' => $lead->created_at ? $lead->created_at->format('Y-m-d') : null,
                'updated_at' => $lead->updated_at ? $lead->updated_at->format('Y-m-d') : null,
                'overdue_followup' => $lead->followup_date && Carbon::parse($lead->followup_date)->isPast(),
            ];
        });

        return response()->json($leads);
    }
}
