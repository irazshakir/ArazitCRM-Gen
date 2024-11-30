<?php

namespace App\Http\Controllers;

use App\Models\InvoicePayment;
use App\Models\Invoice;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoicePaymentController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'amount' => 'required|numeric|min:0',
            'payment_date' => 'required|date',
            'payment_method' => 'required|string|in:cash,bank_transfer,cheque',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $invoice = Invoice::findOrFail($request->invoice_id);

            // Map payment methods to account payment modes
            $paymentModeMap = [
                'cash' => 'Cash',
                'bank_transfer' => 'Online',
                'cheque' => 'Cheque'
            ];

            // Create payment record
            $payment = $invoice->invoice_payments()->create([
                'amount' => $request->amount,
                'payment_date' => $request->payment_date,
                'payment_method' => $request->payment_method,
                'transaction_reference' => $request->transaction_reference,
                'notes' => $request->notes,
            ]);

            // Create account transaction with mapped payment mode
            Account::create([
                'payment_type' => 'Received',
                'payment_mode' => $paymentModeMap[$request->payment_method],
                'transaction_type' => 'Credit',
                'amount' => $request->amount,
                'invoice_id' => $invoice->id,
                'notes' => $request->notes ?? 'Payment added for invoice #' . $invoice->invoice_number,
                'created_by' => auth()->id()
            ]);

            // Update invoice amounts and status
            $totalReceived = $invoice->invoice_payments()->sum('amount');
            $invoice->update([
                'amount_received' => $totalReceived,
                'amount_remaining' => $invoice->total_amount - $totalReceived,
                'status' => $totalReceived >= $invoice->total_amount ? 'paid' : 'partially_paid',
                'updated_by' => auth()->id(),
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Payment added successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error adding payment: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to add payment');
        }
    }

    public function destroy(InvoicePayment $payment)
    {
        try {
            DB::beginTransaction();

            $invoice = $payment->invoice;

            // Delete corresponding account transaction
            Account::where([
                'invoice_id' => $invoice->id,
                'amount' => $payment->amount,
                'payment_type' => 'Received'
            ])->delete();

            // Delete the payment
            $payment->delete();

            // Update invoice amounts and status
            $totalReceived = $invoice->invoice_payments()->sum('amount');
            $invoice->update([
                'amount_received' => $totalReceived,
                'amount_remaining' => $invoice->total_amount - $totalReceived,
                'status' => $totalReceived > 0 ? 'partially_paid' : 'pending',
                'updated_by' => auth()->id(),
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Payment deleted successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error deleting payment: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to delete payment');
        }
    }
} 