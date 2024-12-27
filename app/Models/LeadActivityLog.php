<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadActivityLog extends Model
{
    protected $fillable = [
        'lead_id',
        'user_id',
        'activity_type',
        'activity_details'
    ];

    protected $casts = [
        'activity_details' => 'array',
    ];

    /**
     * Get the lead that owns the activity.
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * Get the user who performed the activity.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
