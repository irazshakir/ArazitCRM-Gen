<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\InvoicePayment;
use App\Models\Invoice;
use App\Http\Requests\StoreAccountRequest;
use App\Http\Requests\UpdateAccountRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class AccountController extends Controller
{
    public function index()
    {
        $query = Account::with(['creator', 'lead', 'invoice.lead'])
            ->latest();

        // Apply date range filter
        if (request()->filled(['start_date', 'end_date'])) {
            $query->whereBetween('created_at', [
                request('start_date') . ' 00:00:00',
                request('end_date') . ' 23:59:59'
            ]);
        }

        // Apply search filter
        if (request()->filled('search')) {
            $search = request('search');
            $query->where(function($q) use ($search) {
                $q->whereHas('invoice', function($q) use ($search) {
                    $q->where('invoice_number', 'like', "%{$search}%");
                })
                ->orWhereHas('invoice.lead', function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%");
                })
                ->orWhere('vendor_name', 'like', "%{$search}%");
            });
        }

        // Apply other filters
        if (request()->filled('payment_type')) {
            $query->where('payment_type', request('payment_type'));
        }
        if (request()->filled('payment_mode')) {
            $query->where('payment_mode', request('payment_mode'));
        }
        if (request()->filled('transaction_type')) {
            $query->where('transaction_type', request('transaction_type'));
        }

        $accounts = $query->paginate(10)
            ->withQueryString();

        // Calculate stats based on current filters
        $statsQuery = clone $query;
        
        // Calculate total income (all Received payments)
        $totalIncome = $statsQuery->clone()
            ->where('payment_type', 'Received')
            ->sum('amount');

        // Calculate total expenses (Expenses + Vendor Payments)
        $totalExpenses = $statsQuery->clone()
            ->whereIn('payment_type', ['Expenses', 'Vendor Payment'])
            ->sum('amount');

        // Calculate total refunds
        $totalRefunds = $statsQuery->clone()
            ->where('payment_type', 'Refunded')
            ->sum('amount');

        // Calculate net balance
        $netBalance = $totalIncome - ($totalExpenses + $totalRefunds);

        $stats = [
            'total_income' => $totalIncome,
            'total_expenses' => $totalExpenses,
            'total_refunds' => $totalRefunds,
            'net_balance' => $netBalance
        ];

        // Get invoices for both receiving and refunding
        $activeInvoices = Invoice::where(function($query) {
            $query->where(function($q) {
                // For receiving payments
                $q->whereIn('status', ['pending', 'partially_paid'])
                  ->whereColumn('total_amount', '>', 'amount_received');
            })->orWhere(function($q) {
                // For refunds
                $q->whereIn('status', ['paid', 'partially_paid'])
                  ->where('amount_received', '>', 0);
            });
        })->get([
            'id', 
            'invoice_number', 
            'total_amount as amount',
            'amount_received',
            'amount_remaining',
            'status'
        ]);

        return Inertia::render('Account/AccountIndex', [
            'accounts' => $accounts,
            'stats' => $stats,
            'filters' => request()->only([
                'payment_type', 
                'payment_mode', 
                'transaction_type',
                'search',
                'start_date',
                'end_date'
            ]),
            'invoices' => $activeInvoices
        ]);
    }

    public function store(StoreAccountRequest $request)
    {
        $validated = $request->validated();
        
        if ($request->hasFile('document')) {
            $path = $request->file('document')->store('account-documents', 'public');
            $validated['document_path'] = $path;
        }

        $validated['created_by'] = Auth::id();
        $account = Account::create($validated);

        if (isset($validated['invoice_id'])) {
            $invoice = Invoice::findOrFail($validated['invoice_id']);
            
            if ($validated['payment_type'] === 'Received') {
                // Handle payment received
                InvoicePayment::create([
                    'invoice_id' => $validated['invoice_id'],
                    'amount' => $validated['amount'],
                    'payment_date' => now(),
                    'payment_method' => $validated['payment_mode'],
                    'created_by' => Auth::id(),
                    'account_id' => $account->id
                ]);

                // Update invoice amounts
                $invoice->amount_received += $validated['amount'];
                $invoice->amount_remaining = $invoice->total_amount - $invoice->amount_received;
                $invoice->status = $invoice->amount_remaining > 0 ? 'partially_paid' : 'paid';
                $invoice->save();
            } elseif ($validated['payment_type'] === 'Refunded') {
                // Handle refund
                InvoicePayment::create([
                    'invoice_id' => $validated['invoice_id'],
                    'amount' => -$validated['amount'], // Negative amount for refund
                    'payment_date' => now(),
                    'payment_method' => $validated['payment_mode'],
                    'created_by' => Auth::id(),
                    'account_id' => $account->id,
                    'notes' => 'Refund: ' . ($validated['notes'] ?? '')
                ]);

                // Update invoice amounts
                $invoice->amount_received -= $validated['amount'];
                $invoice->amount_remaining = $invoice->total_amount - $invoice->amount_received;
                $invoice->status = 'partially_paid';
                $invoice->save();
            }
        }

        return redirect()->route('accounts.index')
            ->with('success', 'Transaction created successfully.');
    }

    public function edit(Account $account)
    {
        return Inertia::render('Account/AccountEdit', [
            'account' => $account
        ]);
    }

    public function update(UpdateAccountRequest $request, Account $account)
    {
        $validated = $request->validated();
        
        DB::beginTransaction();
        try {
            // Convert amounts to ensure proper decimal handling
            $newAmount = floatval($validated['amount']);
            $originalAmount = floatval($validated['original_amount']);
            $amountDifference = floatval($validated['amount_difference']);

            // Update account
            $account->update([
                'payment_type' => $validated['payment_type'],
                'amount' => $newAmount,
            ]);

            // If this is an invoice-related transaction
            if ($validated['has_invoice'] && in_array($validated['payment_type'], ['Received', 'Refunded'])) {
                if ($amountDifference != 0) {
                    // Create a new invoice payment record for the difference
                    InvoicePayment::create([
                        'invoice_id' => $account->invoice_id,
                        'amount' => $validated['payment_type'] === 'Refunded' ? -$amountDifference : $amountDifference,
                        'payment_date' => now(),
                        'payment_method' => $account->payment_mode,
                        'notes' => 'Amount adjusted from transaction edit',
                        'account_id' => $account->id,
                        'created_by' => auth()->id()
                    ]);

                    // Update invoice amounts
                    $invoice = $account->invoice;
                    if ($validated['payment_type'] === 'Received') {
                        $invoice->amount_received += $amountDifference;
                    } else {
                        $invoice->amount_received -= $amountDifference;
                    }
                    
                    $invoice->amount_remaining = $invoice->total_amount - $invoice->amount_received;
                    $invoice->status = $this->determineInvoiceStatus($invoice);
                    $invoice->save();
                }
            }

            DB::commit();
            return redirect()->route('accounts.index')
                ->with('success', 'Transaction updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Transaction update failed: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to update transaction: ' . $e->getMessage());
        }
    }

    private function determineInvoiceStatus($invoice)
    {
        if ($invoice->amount_received <= 0) return 'pending';
        if ($invoice->amount_received >= $invoice->total_amount) return 'paid';
        return 'partially_paid';
    }

    public function destroy(Account $account)
    {
        // Delete associated document if exists
        if ($account->document_path) {
            Storage::disk('public')->delete($account->document_path);
        }

        $account->delete();

        return redirect()->route('accounts.index')
            ->with('success', 'Transaction deleted successfully.');
    }
}
