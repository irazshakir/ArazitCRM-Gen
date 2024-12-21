<?php

namespace App\Http\Controllers;

use App\Models\LeadDocument;
use App\Models\Lead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class LeadDocumentController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
            'lead_id' => 'required|exists:leads,id',
            'description' => 'nullable|string',
            'document_type' => 'required|string',
        ]);

        try {
            // Check if user has access to this lead
            $lead = Lead::findOrFail($request->lead_id);
            if (Auth::user()->role === 'sales-consultant' && $lead->assigned_user_id !== Auth::id()) {
                abort(403, 'You do not have permission to add documents to this lead.');
            }

            $file = $request->file('file');
            $path = $file->store('lead-documents', 'public');

            LeadDocument::create([
                'lead_id' => $request->lead_id,
                'document_name' => $file->getClientOriginalName(),
                'document_path' => $path,
                'document_type' => $request->document_type,
                'description' => $request->description,
                'uploaded_by' => Auth::id(),
            ]);

            return redirect()->back()->with('success', 'Document uploaded successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Failed to upload document']);
        }
    }

    public function destroy(LeadDocument $document)
    {
        try {
            // Check if user has access to this document
            $lead = Lead::findOrFail($document->lead_id);
            if (Auth::user()->role === 'sales-consultant' && $lead->assigned_user_id !== Auth::id()) {
                abort(403, 'You do not have permission to delete this document.');
            }

            Storage::disk('public')->delete($document->document_path);
            $document->delete();
            return redirect()->back()->with('success', 'Document deleted successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Failed to delete document']);
        }
    }

    public function download(LeadDocument $document)
    {
        // Check if user has access to this document
        $lead = Lead::findOrFail($document->lead_id);
        if (Auth::user()->role === 'sales-consultant' && $lead->assigned_user_id !== Auth::id()) {
            abort(403, 'You do not have permission to download this document.');
        }

        try {
            return Storage::disk('public')->download(
                $document->document_path,
                $document->document_name
            );
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Failed to download document']);
        }
    }
}
