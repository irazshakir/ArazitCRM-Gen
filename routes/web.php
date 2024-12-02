<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\LeadNotesController;
use App\Http\Controllers\LeadDocumentController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\InvoicePaymentController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\MarketingController;
use App\Http\Controllers\DashboardController;
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
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::group(['middleware' => function ($request, $next) {
        if (Auth::user()->role !== 'admin') {
            abort(403, 'Unauthorized action.');
        }
        return $next($request);
    }, 'prefix' => 'admin'], function () {
        Route::resource('leads', LeadController::class);
        Route::post('leads/bulk-upload', [LeadController::class, 'bulkUpload'])->name('leads.bulk-upload');
        Route::get('leads/template-download', [LeadController::class, 'downloadTemplate'])->name('leads.template-download');
        // lead notes related routes 
        Route::post('lead-notes', [LeadNotesController::class, 'store'])->name('lead-notes.store');
        Route::post('lead-documents', [LeadDocumentController::class, 'store'])->name('lead-documents.store');
        Route::delete('lead-documents/{document}', [LeadDocumentController::class, 'destroy'])->name('lead-documents.destroy');
        Route::get('lead-documents/{document}/download', [LeadDocumentController::class, 'download'])->name('lead-documents.download');

        Route::get('invoices', [InvoiceController::class, 'index'])->name('invoices.index');
        Route::post('invoices', [InvoiceController::class, 'store'])->name('invoices.store');
        Route::get('invoices/create', [InvoiceController::class, 'create'])->name('invoices.create');
        Route::get('invoices/generate-number', [InvoiceController::class, 'generateInvoiceNumber'])
            ->name('invoices.generate-number');
        Route::get('invoices/won-leads', [InvoiceController::class, 'getWonLeads'])
            ->name('invoices.won-leads');
        Route::get('invoices/{invoice}', [InvoiceController::class, 'show'])->name('invoices.show');
        Route::put('invoices/{invoice}', [InvoiceController::class, 'update'])->name('invoices.update');
        Route::delete('invoices/{invoice}', [InvoiceController::class, 'destroy'])->name('invoices.destroy');
        Route::get('invoices/{invoice}/edit', [InvoiceController::class, 'edit'])->name('invoices.edit');
        Route::get('invoices/{invoice}/download', [InvoiceController::class, 'download'])->name('invoices.download');
        Route::post('invoice-payments', [InvoicePaymentController::class, 'store'])->name('invoice-payments.store');
        Route::delete('invoice-payments/{payment}', [InvoicePaymentController::class, 'destroy'])
            ->name('invoice-payments.destroy');
        Route::get('accounts', [AccountController::class, 'index'])->name('accounts.index');
        Route::post('accounts', [AccountController::class, 'store'])->name('accounts.store');
        Route::get('accounts/create', [AccountController::class, 'create'])->name('accounts.create');
        Route::get('accounts/{account}', [AccountController::class, 'show'])->name('accounts.show');
        Route::put('accounts/{account}', [AccountController::class, 'update'])->name('accounts.update');
        Route::delete('accounts/{account}', [AccountController::class, 'destroy'])->name('accounts.destroy');
        Route::get('accounts/{account}/edit', [AccountController::class, 'edit'])->name('accounts.edit');

        // User Management Routes
        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::post('users', [UserController::class, 'store'])->name('users.store');
        Route::get('users/{user}/edit', [UserController::class, 'edit'])->name('users.edit');
        Route::put('users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

        // Marketing Routes
        Route::get('marketing', [MarketingController::class, 'index'])->name('marketing.index');
        Route::post('marketing', [MarketingController::class, 'store'])->name('marketing.store');
        Route::get('marketing/{marketing}/edit', [MarketingController::class, 'edit'])->name('marketing.edit');
        Route::put('marketing/{marketing}', [MarketingController::class, 'update'])->name('marketing.update');
        Route::delete('marketing/{marketing}', [MarketingController::class, 'destroy'])->name('marketing.destroy');
        Route::get('reports/marketing', [MarketingController::class, 'report'])->name('marketing.report');

        // Settings route
        Route::resource('settings', SettingController::class);
    });

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::middleware(['auth'])->group(function () {
        Route::get('/reports/leads', [ReportController::class, 'leadsReport'])->name('reports.leads');
        Route::get('/reports/sales', [ReportController::class, 'salesReport'])->name('reports.sales');
        Route::get('/reports/marketing', [ReportController::class, 'marketingReport'])->name('reports.marketing');
        // Add other report routes
    });
});

require __DIR__.'/auth.php';
