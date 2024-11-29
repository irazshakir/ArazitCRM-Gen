<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Account extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_type',
        'lead_id',
        'invoice_id',
        'payment_mode',
        'document_path',
        'transaction_type',
        'vendor_name',
        'amount',
        'notes',
        'created_by',
        'updated_by'
    ];

    // Cast amount to integer before saving
    public function setAmountAttribute($value)
    {
        $this->attributes['amount'] = (int) $value;
    }

    // Format amount when retrieving
    public function getAmountAttribute($value)
    {
        return number_format($value, 2, '.', '');
    }

    // Relationships
    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
