<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeadNotes extends Model
{
    protected $fillable = [
        'lead_id',
        'note',
        'added_by'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'added_by');
    }

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }
}
