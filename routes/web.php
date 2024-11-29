<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\LeadNotesController;
use App\Http\Controllers\LeadDocumentController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');

    Route::group(['middleware' => function ($request, $next) {
        if (Auth::user()->role !== 'admin') {
            abort(403, 'Unauthorized action.');
        }
        return $next($request);
    }, 'prefix' => 'admin'], function () {
        Route::resource('leads', LeadController::class);
        Route::post('leads/bulk-upload', [LeadController::class, 'bulkUpload'])->name('leads.bulk-upload');
        Route::get('leads/template-download', [LeadController::class, 'downloadTemplate'])->name('leads.template-download');
    });

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::post('lead-notes', [LeadNotesController::class, 'store'])->name('lead-notes.store');
    Route::post('lead-documents', [LeadDocumentController::class, 'store'])->name('lead-documents.store');
    Route::delete('lead-documents/{document}', [LeadDocumentController::class, 'destroy'])->name('lead-documents.destroy');
    Route::get('lead-documents/{document}/download', [LeadDocumentController::class, 'download'])->name('lead-documents.download');
});

require __DIR__.'/auth.php';
