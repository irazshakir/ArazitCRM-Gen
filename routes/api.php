Route::get('/settings', [\App\Http\Controllers\Api\SettingController::class, 'index']); 
Route::post('/webhook/leads', [\App\Http\Controllers\LeadController::class, 'storeFromWebhook']);