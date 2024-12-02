<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Marketing extends Model
{
    use HasFactory;

    protected $table = 'marketing';

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

    protected $fillable = [
        'campaign_name',
        'cost',
        'lead_source',
        'start_date',
        'end_date',
        'campaign_status'
    ];

    protected $casts = [
        'cost' => 'decimal:2',
        'campaign_status' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class, 'lead_source', 'lead_source');
    }
}
