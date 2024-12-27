<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\User;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Traits\LogsLeadActivity;
use App\Events\LeadCreated;
use App\Events\LeadUpdated;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use App\Imports\LeadsImport;
use Maatwebsite\Excel\Facades\Excel;

class LeadController extends Controller
{
    use LogsLeadActivity;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = Lead::query()
                ->with(['assignedUser', 'product'])
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
                    $query->whereRaw('lead_active_status = ?', [$request->lead_active_status === '1']);
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
                })
                ->when($request->product_id, function ($query, $productId) {
                    $query->where('product_id', $productId);
                })
                ->when($request->notification_status !== null, function ($query) use ($request) {
                    $query->whereRaw('notification_status = ?', [($request->notification_status === '1') ? 'true' : 'false']);
                });

            $query->orderByDesc('lead_active_status')
                ->orderBy('followup_date')
                ->orderBy(DB::raw("CASE 
                    WHEN followup_period = 'AM' THEN 1 
                    WHEN followup_period = 'PM' THEN 2 
                    ELSE 3 END"))
                ->orderBy('followup_hour')
                ->orderBy('followup_minute');

            $perPage = $request->input('per_page', 10);
            $leads = $query->latest()->paginate($perPage);
            
            $leads->through(function ($lead) {
                $lead->followup_required = $lead->followup_date && 
                    Carbon::parse($lead->followup_date)->endOfDay()->isPast();
                return $lead;
            });

            $users = User::whereRaw('is_active = true')->get(['id', 'name']);

            return Inertia::render('Lead/LeadIndex', [
                'auth' => [
                    'user' => Auth::user()
                ],
                'leads' => $leads,
                'filters' => $request->all([
                    'search', 
                    'assigned_user_id', 
                    'lead_status', 
                    'lead_source', 
                    'followup_filter', 
                    'lead_active_status',
                    'notification_status'
                ]),
                'users' => $users,
                'leadConstants' => [
                    'STATUSES' => Lead::STATUSES,
                    'SOURCES' => Lead::LEAD_SOURCES,
                ],
                'products' => Product::whereRaw('active_status =true')
                    ->orderBy('name')
                    ->get(['id', 'name']),
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
        if (!auth()->user()->can('create', Lead::class)) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'required|string|max:20',
            'city' => 'nullable|string|max:255',
            'lead_status' => 'required|string',
            'lead_source' => 'required|string',
            'initial_remarks' => 'nullable|string',
            'assigned_user_id' => 'required|exists:users,id',
            'followup_date' => 'nullable|date',
            'followup_hour' => 'nullable|integer|min:1|max:12',
            'followup_minute' => ['nullable', 'regex:/^\d+$/', 'min:0', 'max:59'],
            'followup_period' => 'nullable|in:AM,PM',
            'product_id' => 'nullable|exists:products,id',
        ]);

        // Set default values for required fields
        $validated = array_merge([
            'city' => 'Others',
            'lead_source' => 'Facebook',
            'lead_status' => 'Query',
        ], $validated);

        // Convert followup_minute to integer if it exists
        if (isset($validated['followup_minute'])) {
            $validated['followup_minute'] = (int) $validated['followup_minute'];
        }

        // Generate email from phone if not provided
        if (empty($validated['email'])) {
            // Remove any non-numeric characters from phone
            $cleanPhone = preg_replace('/[^0-9]/', '', $validated['phone']);
            $validated['email'] = $cleanPhone . '@test.com';
        }

        $lead = Lead::create([
            ...$validated,
            'created_by' => auth()->id(),
            'lead_active_status' => DB::raw('true'),
        ]);

        // Log the lead creation activity
        $this->logLeadActivity($lead->id, 'field_updated', [
            'action' => 'created',
            'created_by' => auth()->user()->name,
            'assigned_to' => User::find($validated['assigned_user_id'])->name,
        ]);

        event(new LeadCreated($lead));

        return redirect()->route('leads.index')
            ->with('success', 'Lead created successfully.');
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
        if (!auth()->user()->can('view', $lead)) {
            abort(403, 'Unauthorized action.');
        }

        // Update notification status if the assigned user is viewing the lead
        if (auth()->id() === $lead->assigned_user_id && !$lead->notification_status) {
            $lead->update([
                'notification_status' => DB::raw('true')
            ]);
            
            // Log the activity
            $this->logLeadActivity($lead->id, 'field_updated', [
                'action' => 'notification_viewed',
                'field' => 'notification_status',
                'old_value' => false,
                'new_value' => true,
                'viewed_by' => auth()->user()->name
            ]);
        }

        return Inertia::render('Lead/LeadEdit', [
            'lead' => $lead->load([
                'assignedUser', 
                'product',
                'activityLogs' => function($query) {
                    $query->with('user')->latest();
                },
                'notes.user',
                'documents.user'
            ]),
            'users' => User::where('role', 'sales-consultant')
                         ->whereRaw('is_active = true')
                         ->get(),
            'leadConstants' => [
                'STATUSES' => config('constants.lead.STATUSES'),
                'SOURCES' => config('constants.lead.SOURCES'),
                'CITIES' => config('constants.lead.CITIES'),
            ],
            'products' => Product::all(),
            'can' => [
                'edit' => auth()->user()->can('update', $lead),
                'delete' => auth()->user()->can('delete', $lead),
                'view_activity_log' => auth()->user()->can('viewActivityLog', $lead),
            ],
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Lead $lead)
    {
        if (!auth()->user()->can('update', $lead)) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'required|string|max:20',
            'city' => 'nullable|string|max:255',
            'lead_status' => 'required|string',
            'lead_source' => 'required|string',
            'initial_remarks' => 'nullable|string',
            'assigned_user_id' => 'required|exists:users,id',
            'followup_date' => 'nullable|date',
            'followup_hour' => 'nullable|integer|min:1|max:12',
            'followup_minute' => ['nullable', 'regex:/^\d+$/', 'min:0', 'max:59'],
            'followup_period' => 'nullable|in:AM,PM',
            'product_id' => 'nullable|exists:products,id',
            'lead_active_status' => 'boolean',
        ]);

        // Set default values for required fields if not provided
        $validated = array_merge([
            'city' => 'Others',
            'lead_source' => 'Facebook',
            'lead_status' => 'Query',
            'lead_active_status' => true,
        ], $validated);

        // Convert followup_minute to integer if it exists
        if (isset($validated['followup_minute'])) {
            $validated['followup_minute'] = (int) $validated['followup_minute'];
        }

        // Generate email from phone if not provided
        if (empty($validated['email'])) {
            // Remove any non-numeric characters from phone
            $cleanPhone = preg_replace('/[^0-9]/', '', $validated['phone']);
            $validated['email'] = $cleanPhone . '@test.com';
        }

        // Convert lead_active_status to a proper PostgreSQL boolean
        if (isset($validated['lead_active_status'])) {
            $validated['lead_active_status'] = DB::raw($validated['lead_active_status'] ? 'true' : 'false');
        }

        // Get the original values before update
        $originalValues = $lead->getOriginal();

        // Update the lead
        $lead->update($validated);

        // Compare and log changes
        $changes = [];
        foreach ($validated as $key => $value) {
            if (isset($originalValues[$key]) && $originalValues[$key] !== $value) {
                $changes[$key] = [
                    'old' => $originalValues[$key],
                    'new' => $value
                ];
            }
        }

        if (!empty($changes)) {
            $this->logLeadActivity($lead->id, 'field_updated', [
                'action' => 'updated',
                'changes' => $changes
            ]);
            event(new LeadUpdated($lead));
        }

        return redirect()->back()
            ->with('success', 'Lead updated successfully.');
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
            
            // Set default values for imported leads
            config(['excel.imports.leads.defaults' => [
                'lead_active_status' => DB::raw('true'),
                'notification_status' => DB::raw('false')  // Set notification_status to false for imported leads
            ]]);
            
            $import = new LeadsImport;
            Excel::import($import, $request->file('file'));

            // Get the imported leads and broadcast events
            $importedLeads = $import->getImportedLeads();
            foreach ($importedLeads as $lead) {
                event(new LeadCreated($lead));
            }
            
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

    public function storeFromWebhook(Request $request)
    {
        try {
            \Log::info('Webhook Request', [
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'headers' => $request->headers->all(),
                'content' => $request->getContent(),
                'all' => $request->all()
            ]);

            // Verify webhook secret
            if ($request->header('X-Webhook-Secret') !== env('MAKE_WEBHOOK_SECRET')) {
                \Log::error('Webhook authentication failed', [
                    'provided' => $request->header('X-Webhook-Secret'),
                    'expected' => env('MAKE_WEBHOOK_SECRET')
                ]);
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $rawInput = trim($request->getContent(), '"');
            \Log::info('Raw Input', ['input' => $rawInput]);

            // Parse the input (assuming format: "Name+PhoneNumber")
            preg_match('/^(.+?)(\+\d+)(.*)$/', $rawInput, $matches);

            if (count($matches) < 4) {
                \Log::error('Invalid input format', ['raw_input' => $rawInput]);
                return response()->json([
                    'message' => 'Invalid input format',
                    'raw_input' => $rawInput
                ], 422);
            }

            $name = trim($matches[1]);
            $phone = trim($matches[2]);
            $city = 'Others';

            // Create lead without broadcasting
            $lead = Lead::create([
                'name' => $name,
                'phone' => $phone,
                'email' => $phone . '@test.com',
                'city' => $city,
                'assigned_user_id' => 1,
                'lead_source' => 'Facebook',
                'lead_status' => 'Query',
                'lead_active_status' => DB::raw('true'),
                'notification_status' => DB::raw('true'),
                'assigned_at' => now(),
                'followup_date' => now()->format('Y-m-d'),
            ]);

            // Log success
            \Log::info('Lead created successfully', ['lead_id' => $lead->id]);

            return response()->json([
                'message' => 'Lead stored successfully',
                'lead' => $lead
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Webhook error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to store lead',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function unreadCount()
    {
        $unreadCount = Lead::where('assigned_user_id', Auth::id())
            ->whereRaw('notification_status = ?', [true])
            ->count();

        return response()->json(['unread_count' => $unreadCount]);
    }

    public function unreadNotifications()
    {
        try {
            $notifications = Lead::query()
                ->where('assigned_user_id', Auth::id())
                ->whereRaw('notification_status = true')
                ->select('id', 'name', 'notification_status', 'created_at')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'notifications' => $notifications
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch notifications',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function markAsViewed(Lead $lead)
    {
        try {
            if ($lead->assigned_user_id === Auth::id()) {
                $updated = DB::table('leads')
                    ->where('id', $lead->id)
                    ->update(['notification_status' => DB::raw('false')]);

                return response()->json([
                    'success' => true,
                    'updated' => (bool)$updated
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark as viewed',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
