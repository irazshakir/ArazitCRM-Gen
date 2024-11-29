<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeadDocument extends Model
{
    protected $fillable = [
        'lead_id',
        'document_name',
        'document_path',
        'document_type',
        'description',
        'uploaded_by'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }
}
