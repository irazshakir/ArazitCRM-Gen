Route::get('/settings', [\App\Http\Controllers\Api\SettingController::class, 'index']); 
Route::post('/webhook/leads', [\App\Http\Controllers\LeadController::class, 'storeFromWebhook']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/dashboard/leads', [\App\Http\Controllers\Api\DashboardController::class, 'leads']);
});