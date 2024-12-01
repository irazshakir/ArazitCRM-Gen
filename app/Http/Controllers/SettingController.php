<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Http\Requests\StoreSettingRequest;
use App\Http\Requests\UpdateSettingRequest;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $setting = Setting::first() ?? new Setting();
        return Inertia::render('Setting/SettingIndex', [
            'setting' => $setting
        ]);
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
    public function store(StoreSettingRequest $request)
    {
        $validated = $request->validated();
        
        if ($request->hasFile('company_logo')) {
            $path = $request->file('company_logo')->store('company_logos', 'public');
            $validated['company_logo'] = $path;
        }

        Setting::create($validated);

        return redirect()->back()->with('success', 'Settings saved successfully');
    }

    /**
     * Display the specified resource.
     */
    public function show(Setting $setting)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Setting $setting)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateSettingRequest $request, Setting $setting)
    {
        $validated = $request->validated();

        if ($request->hasFile('company_logo')) {
            // Delete old logo
            if ($setting->company_logo) {
                Storage::disk('public')->delete($setting->company_logo);
            }
            $path = $request->file('company_logo')->store('company_logos', 'public');
            $validated['company_logo'] = $path;
        }

        $setting->update($validated);

        return redirect()->back()->with('success', 'Settings updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Setting $setting)
    {
        //
    }
}
