<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lead extends Model
{
    protected $fillable = [
        'name',
        'phone',
        'email',
        'city',
        'assigned_user_id',
        'created_by',
        'lead_status',
        'lead_active_status',
        'notification_status',
        'initial_remarks',
        'followup_date',
        'followup_hour',
        'followup_minute',
        'followup_period',
        'won_at',
        'closed_at',
        'lead_source',
        'product_id'
    ];

    protected $casts = [
        'lead_active_status' => 'boolean',
        'notification_status' => 'boolean',
        'name' => 'string',
        'phone' => 'string',
        'email' => 'string',
        'city' => 'string',
        'lead_source' => 'string',
        'lead_status' => 'string',
        'initial_remarks' => 'string',
        'followup_date' => 'datetime',
        'followup_hour' => 'string',
        'followup_minute' => 'string',
        'followup_period' => 'string',
        'assigned_user_id' => 'integer',
        'created_by' => 'integer',
        'product_id' => 'integer',
        'won_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    protected $attributes = [
        'followup_hour' => null,
        'followup_minute' => null,
        'followup_period' => null,
        'initial_remarks' => null,
        'email' => null,
        'city' => null,
        'product_id' => null,
        'won_at' => null,
        'closed_at' => null
    ];

    // Define constants for validation
    public const CITIES = [
        'Lahore',
        'Islamabad',
        'Karachi',
        'Rawalpindi',
        'Peshawar',
        'Gujrat',
        'Gujranwala',
        'Sialkot',
        'Faisalabad',
        'Multan',
        'Others'
    ];

    

    public const STATUSES = [
        'Initial Contact',
        'Query',
        'Negotiation',
        'Won',
        'Lost',
        'Non-Potential',
        'No-Reply',
        'Call-Back-Later'
    ];

    const LEAD_SOURCES = [
        'Facebook',
        'Instagram',
        'LinkedIn',
        'Whatsapp',
        'Google-Ads',
        'Youtube-Ads',
        'SEO',
        'Direct-Call',
        'Twitter',
        'Client-Referral',
        'Personal-Referral',
        'Others'
    ];

    protected $table = 'leads';

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(LeadNotes::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(LeadDocument::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the user who created the lead.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get all activity logs for this lead.
     */
    public function activityLogs(): HasMany
    {
        return $this->hasMany(LeadActivityLog::class)->orderBy('created_at', 'desc');
    }
}
