<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Http\Requests\StoreLeadRequest;
use App\Http\Requests\UpdateLeadRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\LeadsImport;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class LeadController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = Lead::query()
                ->with('assignedUser')
                ->when($request->search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
                })
                ->when($request->assigned_user_id, function ($query, $userId) {
                    $query->where('assigned_user_id', $userId);
                })
                ->when($request->lead_status, function ($query, $status) {
                    $query->where('lead_status', $status);
                })
                ->when($request->lead_source, function ($query, $source) {
                    $query->where('lead_source', $source);
                })
                ->when($request->lead_active_status !== null, function ($query) use ($request) {
                    $query->where('lead_active_status', $request->lead_active_status === '1');
                })
                ->when($request->followup_filter, function ($query, $filter) {
                    switch ($filter) {
                        case 'today':
                            $query->whereDate('followup_date', today());
                            break;
                        case 'week':
                            $query->whereBetween('followup_date', [now()->startOfWeek(), now()->endOfWeek()]);
                            break;
                        case 'month':
                            $query->whereMonth('followup_date', now()->month)
                                ->whereYear('followup_date', now()->year);
                            break;
                        case 'overdue':
                            $query->where('followup_date', '<', today())
                                ->where('updated_at', '<', today());
                            break;
                    }
                });

            $query->orderByDesc('lead_active_status')
                ->orderBy('followup_date')
                ->orderBy(DB::raw("CASE 
                    WHEN followup_period = 'AM' THEN 1 
                    WHEN followup_period = 'PM' THEN 2 
                    ELSE 3 END"))
                ->orderBy('followup_hour')
                ->orderBy('followup_minute');

            $leads = $query->latest()->paginate(10)->withQueryString();
            
            $leads->through(function ($lead) {
                $lead->followup_required = $lead->followup_date && 
                    Carbon::parse($lead->followup_date)->endOfDay()->isPast();
                return $lead;
            });

            $users = User::where('is_active', true)->get(['id', 'name']);

            return Inertia::render('Lead/LeadIndex', [
                'auth' => [
                    'user' => Auth::user()
                ],
                'leads' => [
                    'data' => $leads->items(),
                    'meta' => [
                        'total' => $leads->total(),
                        'per_page' => $leads->perPage(),
                        'current_page' => $leads->currentPage(),
                        'last_page' => $leads->lastPage(),
                        'from' => $leads->firstItem(),
                        'to' => $leads->lastItem(),
                    ],
                    'links' => $leads->linkCollection()->toArray(),
                ],
                'users' => $users,
                'filters' => $request->only([
                    'search',
                    'assigned_user_id',
                    'lead_status',
                    'lead_source',
                    'followup_filter',
                    'lead_active_status'
                ]),
                'can' => [
                    'create_lead' => Auth::user()->role === 'admin',
                    'edit_lead' => Auth::user()->role === 'admin',
                    'delete_lead' => Auth::user()->role === 'admin',
                ],
                'leadConstants' => [
                    'STATUSES' => Lead::STATUSES,
                    'SOURCES' => Lead::LEAD_SOURCES,
                    'CITIES' => Lead::CITIES,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in LeadController@index', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
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
    public function store(Request $request)
    {
        // Basic validation for minimum required fields
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|unique:leads,phone',
            'assigned_user_id' => 'nullable|exists:users,id',
            'lead_source' => 'required|in:' . implode(',', Lead::LEAD_SOURCES),
            'initial_remarks' => 'nullable|string',
            'followup_date' => 'nullable|date',
            'followup_hour' => 'nullable|string',
            'followup_minute' => 'nullable|string',
            'followup_period' => 'nullable|in:AM,PM',
        ]);

        try {
            $lead = Lead::create([
                'name' => $request->name,
                'phone' => $request->phone,
                'email' => $request->email ?? $request->phone . '@placeholder.com',
                'assigned_user_id' => $request->assigned_user_id,
                'lead_source' => $request->lead_source,
                'lead_status' => $request->lead_status ?? 'Query',
                'initial_remarks' => $request->initial_remarks,
                'followup_date' => $request->followup_date,
                'followup_hour' => $request->followup_hour,
                'followup_minute' => $request->followup_minute,
                'followup_period' => $request->followup_period,
                'lead_active_status' => true,
                'city' => $request->city ?? 'Others',
                'assigned_at' => $request->assigned_user_id ? now() : null,
            ]);

            return redirect()->back()->with('success', 'Lead created successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Failed to create lead. ' . $e->getMessage()]);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Lead $lead)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Lead $lead)
    {
        $users = User::where('is_active', true)->get(['id', 'name']);

        return Inertia::render('Lead/LeadEdit', [
            'lead' => $lead->load(['assignedUser', 'notes.user', 'documents.user']),
            'users' => $users,
            'leadConstants' => [
                'STATUSES' => Lead::STATUSES,
                'SOURCES' => Lead::LEAD_SOURCES,
                'CITIES' => Lead::CITIES,
            ],
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Lead $lead)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:leads,email,' . $lead->id,
            'phone' => 'required|string|unique:leads,phone,' . $lead->id,
            'city' => 'required|in:' . implode(',', Lead::CITIES),
            'lead_status' => 'required|in:' . implode(',', Lead::STATUSES),
            'lead_source' => 'required|in:' . implode(',', Lead::LEAD_SOURCES),
            'initial_remarks' => 'nullable|string',
            'assigned_user_id' => 'required|exists:users,id',
            'followup_date' => 'nullable|date',
            'followup_hour' => 'nullable|string',
            'followup_minute' => 'nullable|string',
            'followup_period' => 'nullable|in:AM,PM',
            'lead_active_status' => 'required|boolean',
        ]);

        // Handle assigned user change
        if ($lead->assigned_user_id !== $validated['assigned_user_id']) {
            $validated['assigned_at'] = now();
            $validated['notification_status'] = true;
        }

        // Handle lead status change
        if ($validated['lead_status'] === 'Won') {
            $validated['won_at'] = now();
        } elseif ($lead->lead_status === 'Won' && $validated['lead_status'] !== 'Won') {
            $validated['won_at'] = null;
        }

        // Handle active status change
        if (!$validated['lead_active_status'] && $lead->lead_active_status) {
            $validated['closed_at'] = now();
        }

        $lead->update($validated);

        return redirect()->back()->with('success', 'Lead updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Lead $lead)
    {
        try {
            $lead->delete();
            return redirect()->back()->with('success', 'Lead deleted successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Failed to delete lead']);
        }
    }

    public function bulkUpload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv'
        ]);

        try {
            DB::beginTransaction();
            
            $import = new LeadsImport;
            Excel::import($import, $request->file('file'));
            
            DB::commit();
            
            $message = 'Leads imported successfully';
            if ($import->getSkippedCount() > 0) {
                $message .= '. ' . $import->getSkippedCount() . ' leads were skipped due to duplicate phone/email.';
            }
            
            return back()->with('success', $message);
        } catch (\Exception $e) {
            // ... rest of your error handling ...
        }
    }

    public function downloadTemplate()
    {
        $headers = [
            'Content-Type' => 'application/vnd.ms-excel',
            'Content-Disposition' => 'attachment; filename="leads-template.xlsx"'
        ];

        return response()->download(
            storage_path('app/templates/leads-template.xlsx'),
            'leads-template.xlsx',
            $headers
        );
    }
}
