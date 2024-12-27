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
        'followup_date' => 'datetime',
        'won_at' => 'datetime',
        'closed_at' => 'datetime',
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
}
