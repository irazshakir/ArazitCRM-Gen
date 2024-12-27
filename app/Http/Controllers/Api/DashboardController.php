<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function leads(Request $request)
    {
        $query = Lead::with('assigned_user');
        
        // Filter by user if specified
        if ($request->has('user_id')) {
            $query->where('assigned_user_id', $request->user_id);
        }

        // Filter by type
        switch ($request->type) {
            case 'active':
                $query->where('lead_active_status', true);
                break;
            case 'followup':
                $query->where(function($q) {
                    $today = Carbon::today();
                    $q->whereDate('followup_date', '<=', $today)
                      ->where('lead_active_status', true);
                });
                break;
            case 'total':
            default:
                // No additional filters for total leads - show all leads
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
                'assigned_user' => $lead->assigned_user ? [
                    'id' => $lead->assigned_user->id,
                    'name' => $lead->assigned_user->name,
                ] : null,
                'followup_date' => $followupDateTime,
                'lead_status' => $lead->lead_status,
                'lead_active_status' => $lead->lead_active_status,
                'email' => $lead->email,
                'city' => $lead->city,
                'lead_source' => $lead->lead_source,
            ];
        });

        return response()->json($leads);
    }
}
