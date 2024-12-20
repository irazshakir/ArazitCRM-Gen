<?php

namespace App\Events;

use App\Models\Lead;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;

class LeadUpdated implements ShouldBroadcast
{
    use InteractsWithSockets, SerializesModels;

    public $leadData;
    public $queue = 'sync'; // Force sync processing for this event

    /**
     * Create a new event instance.
     *
     * @param Lead $lead
     */
    public function __construct(Lead $lead)
    {
        // Prepare the data to broadcast
        $this->leadData = [
            'id' => $lead->id,
            'name' => $lead->name,
            'phone' => $lead->phone,
            'assigned_user_id' => $lead->assigned_user_id,
            'lead_status' => $lead->lead_status,
            'followup_date' => $lead->followup_date,
            'followup_hour' => $lead->followup_hour,
            'followup_minute' => $lead->followup_minute,
            'followup_period' => $lead->followup_period,
            'product_id' => $lead->product_id,
            'lead_active_status' => (bool)$lead->lead_active_status,
            'updated_at' => $lead->updated_at,
            'notification_status' => $lead->notification_status,
        ];
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return Channel|array
     */
    public function broadcastOn()
    {
        // Use a dedicated channel for leads
        return new Channel('leads');
    }

    public function broadcastAs()
    {
        return 'lead.updated';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array
     */
    public function broadcastWith()
    {
        // Return the prepared lead data
        return $this->leadData;
    }
}
