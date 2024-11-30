<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Lead;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use App\Http\Requests\StoreInvoiceRequest;
use Illuminate\Support\Facades\DB;
use Inertia\Response;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\Account;

class InvoiceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    Public function index(Request $request)
    {
        $query = Invoice::with(['lead', 'invoice_payments'])
            ->select('invoices.*')
            ->selectRaw('COALESCE(SUM(invoice_payments.amount), 0) as total_received')
            ->leftJoin('invoice_payments', 'invoices.id', '=', 'invoice_payments.invoice_id')
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('invoice_number', 'like', "%{$search}%")
                        ->orWhereHas('lead', function ($q) use ($search) {
                            $q->where('name', 'like', "%{$search}%");
                        });
                });
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->date_range, function ($query) use ($request) {
                $dates = explode(',', $request->date_range);
                if (count($dates) === 2) {
                    $query->whereBetween('created_at', $dates);
                }
            })
            ->groupBy('invoices.id')
            ->latest();

        $invoices = $query->paginate(10)->withQueryString();

        // Calculate stats
        $statsQuery = Invoice::query();
        if ($request->date_range) {
            $dates = explode(',', $request->date_range);
            if (count($dates) === 2) {
                $statsQuery->whereBetween('created_at', $dates);
            }
        } else {
            $statsQuery->whereMonth('created_at', now()->month)
                      ->whereYear('created_at', now()->year);
        }

        $stats = [
            'payments_received' => $statsQuery->sum('amount_received'),
            'pending_payments' => Invoice::where('status', 'partially_paid')->sum('amount_remaining'),
            'active_invoices' => Invoice::where('status', 'partially_paid')->count(),
        ];

        return Inertia::render('Invoice/InvoiceIndex', [
            'invoices' => [
                'data' => $invoices->items(),
                'meta' => [
                    'total' => $invoices->total(),
                    'per_page' => $invoices->perPage(),
                    'current_page' => $invoices->currentPage(),
                    'last_page' => $invoices->lastPage(),
                    'from' => $invoices->firstItem(),
                    'to' => $invoices->lastItem(),
                ],
                'links' => $invoices->linkCollection()->toArray(),
            ],
            'stats' => $stats,
            'filters' => $request->only(['search', 'status', 'date_range']) ?? [],
            'can' => [
                'create_invoice' => auth()->user()->role === 'admin',
                'edit_invoice' => auth()->user()->role === 'admin',
                'delete_invoice' => auth()->user()->role === 'admin',
            ],
        ]);
    }

    public function generateInvoiceNumber()
    {
        $year = Carbon::now()->format('y');
        $month = Carbon::now()->format('m');
        
        $lastInvoice = Invoice::whereYear('created_at', Carbon::now()->year)
            ->whereMonth('created_at', Carbon::now()->month)
            ->latest()
            ->first();

        $sequence = $lastInvoice ? intval(substr($lastInvoice->invoice_number, -2)) + 1 : 1;
        
        return $year . $month . str_pad($sequence, 2, '0', STR_PAD_LEFT);
    }

    public function getWonLeads()
    {
        $leads = Lead::where('lead_status', 'Won')
            ->where('lead_active_status', true)
            ->get(['id', 'name']);

        return response()->json($leads);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreInvoiceRequest $request)
    {
        try {
            DB::beginTransaction();

            // Create the invoice
            $invoice = Invoice::create([
                'lead_id' => $request->lead_id,
                'invoice_number' => $this->generateInvoiceNumber(),
                'total_amount' => $request->total_amount,
                'amount_received' => $request->amount_received ?? 0,
                'amount_remaining' => $request->amount_remaining,
                'status' => $request->amount_received > 0 ? 'partially_paid' : 'pending',
                'notes' => $request->notes,
                'created_by' => auth()->id(),
                'updated_by' => auth()->id(),
            ]);

            // Create invoice items
            foreach ($request->invoice_items as $item) {
                $invoice->invoice_items()->create([
                    'service_name' => $item['service_name'],
                    'description' => $item['description'] ?? null,
                    'amount' => $item['amount'],
                ]);
            }

            // If there's an initial payment, create payment record and account transaction
            if ($request->amount_received > 0) {
                // Create payment record
                $invoice->invoice_payments()->create([
                    'amount' => $request->amount_received,
                    'payment_date' => now(),
                    'payment_method' => $request->payment_method ?? 'Cash',
                    'notes' => 'Initial payment at invoice creation',
                ]);

                // Create account transaction
                Account::create([
                    'payment_type' => 'Received',
                    'payment_mode' => $request->payment_method ?? 'Cash',
                    'transaction_type' => 'Credit',
                    'amount' => $request->amount_received,
                    'invoice_id' => $invoice->id,
                    'notes' => $request->notes ?? 'Initial payment for invoice #' . $invoice->invoice_number,
                    'created_by' => auth()->id()
                ]);
            }

            DB::commit();
            return redirect()->back()->with('success', 'Invoice created successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error creating invoice: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Failed to create invoice']);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Invoice $invoice)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Invoice $invoice)
    {
        $invoice->load(['lead', 'invoice_payments']);
        
        return Inertia::render('Invoice/InvoiceEdit', [
            'invoice' => $invoice
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            // Update invoice status based on payments
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
                'notes' => $validated['notes'],
                'updated_by' => auth()->id(),
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Invoice updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to update invoice']);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Invoice $invoice)
    {
        try {
            DB::beginTransaction();
            
            // Delete related payments and items
            $invoice->invoice_payments()->delete();
            $invoice->invoice_items()->delete();
            $invoice->delete();
            
            DB::commit();
            return redirect()->route('invoices.index')->with('success', 'Invoice deleted successfully');
            
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to delete invoice']);
        }
    }

    public function download(Invoice $invoice)
    {
        $invoice->load(['lead', 'invoice_items', 'invoice_payments']);
        
        $data = [
            'invoice' => $invoice,
            'company' => [
                'name' => 'ArazIT',
                'logo' => public_path('images/CRM-Logo.png'),
                'address' => 'CC2 M2 Main Blouvard Lake City Lahore',
                'phone' => '0308 8551111',
                'email' => 'info@arazit.com',
                'website' => 'www.arazit.com'
            ],
            'terms' => [
                '1. Payment is due within 15 days',
                '2. Please include invoice number on your payment',
                '3. Bank transfer is the preferred method of payment',
                '4. Late payment may result in service interruption',
                '5. This invoice is valid for 30 days from the date of issue'
            ]
        ];

        $pdf = PDF::loadView('pdf.invoice', $data);
        
        return $pdf->download('invoice-' . $invoice->invoice_number . '.pdf');
    }

    public function handleAddPayment(Request $request, Invoice $invoice)
    {
        try {
            DB::beginTransaction();

            // Create payment record
            $payment = $invoice->invoice_payments()->create([
                'amount' => $request->amount,
                'payment_date' => $request->payment_date ?? now(),
                'payment_method' => $request->payment_method,
                'transaction_reference' => $request->transaction_reference,
                'notes' => $request->notes,
            ]);

            // Create account transaction
            Account::create([
                'payment_type' => 'Received',
                'payment_mode' => 'Online',
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
            return response()->json(['success' => true, 'message' => 'Payment added successfully']);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error adding payment: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to add payment'], 500);
        }
    }
}
