<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'lead_id',
        'invoice_number',
        'total_amount',
        'amount_received',
        'amount_remaining',
        'status',
        'notes',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'amount_received' => 'decimal:2',
        'amount_remaining' => 'decimal:2',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function created_by_user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updated_by_user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function invoice_items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function invoice_payments(): HasMany
    {
        return $this->hasMany(InvoicePayment::class);
    }
}
