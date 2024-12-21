<?php

namespace App\Http\Controllers;

use App\Models\LeadNotes;
use App\Models\Lead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LeadNotesController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'note' => 'required|string',
            'lead_id' => 'required|exists:leads,id',
        ]);

        // Check if user has access to this lead
        $lead = Lead::findOrFail($validated['lead_id']);
        if (Auth::user()->role === 'sales-consultant' && $lead->assigned_user_id !== Auth::id()) {
            abort(403, 'You do not have permission to add notes to this lead.');
        }

        $note = LeadNotes::create([
            'lead_id' => $validated['lead_id'],
            'note' => $validated['note'],
            'added_by' => Auth::id(),
        ]);

        return redirect()->back()->with('success', 'Note added successfully');
    }
}
