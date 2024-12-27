<?php

namespace App\Traits;

use App\Models\LeadActivityLog;
use Illuminate\Support\Facades\Auth;

trait LogsLeadActivity
{
    /**
     * Log an activity for a lead
     */
    protected function logLeadActivity(int $leadId, string $activityType, array $details = null): void
    {
        LeadActivityLog::create([
            'lead_id' => $leadId,
            'user_id' => Auth::id(),
            'activity_type' => $activityType,
            'activity_details' => $details
        ]);
    }
}
