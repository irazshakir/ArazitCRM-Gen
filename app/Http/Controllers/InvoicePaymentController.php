<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoicePayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoicePaymentController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'amount' => 'required|numeric|min:0',
            'payment_date' => 'required|date',
            'payment_method' => 'required|string',
            'transaction_reference' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $invoice = Invoice::findOrFail($validated['invoice_id']);
            
            // Create payment
            InvoicePayment::create($validated);

            // Update invoice status and amounts
            $totalReceived = $invoice->invoice_payments()->sum('amount');
            
            $status = 'draft';
            if ($totalReceived > 0) {
                if ($totalReceived >= $invoice->total_amount) {
                    $status = 'paid';
                } else {
                    $status = 'partially_paid';
                }
            }

            $invoice->update([
                'amount_received' => $totalReceived,
                'amount_remaining' => $invoice->total_amount - $totalReceived,
                'status' => $status,
                'updated_by' => auth()->id(),
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Payment added successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to add payment']);
        }
    }

    public function destroy(InvoicePayment $payment)
    {
        try {
            DB::beginTransaction();

            $invoice = $payment->invoice;
            
            // Delete the payment
            $payment->delete();

            // Recalculate invoice totals and status
            $totalReceived = $invoice->invoice_payments()->sum('amount');
            
            $status = 'draft';
            if ($totalReceived > 0) {
                if ($totalReceived >= $invoice->total_amount) {
                    $status = 'paid';
                } else {
                    $status = 'partially_paid';
                }
            }

            $invoice->update([
                'amount_received' => $totalReceived,
                'amount_remaining' => $invoice->total_amount - $totalReceived,
                'status' => $status,
                'updated_by' => auth()->id(),
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Payment deleted successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to delete payment']);
        }
    }
} 