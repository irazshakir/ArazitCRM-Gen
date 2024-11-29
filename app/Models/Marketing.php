<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Marketing extends Model
{
    use HasFactory;

    protected $table = 'marketing';

    protected $fillable = [
        'campaign_name',
        'cost',
        'lead_source',
        'start_date',
        'end_date',
        'campaign_status'
    ];

    protected $casts = [
        'cost' => 'decimal',
        'campaign_status' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class, 'lead_source', 'lead_source');
    }
}
