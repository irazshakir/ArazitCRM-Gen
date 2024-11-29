<?php

namespace App\Http\Controllers;

use App\Models\LeadNotes;
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

        $note = LeadNotes::create([
            'lead_id' => $validated['lead_id'],
            'note' => $validated['note'],
            'added_by' => Auth::id(),
        ]);

        return redirect()->back()->with('success', 'Note added successfully');
    }
}
