<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function index()
    {
        $users = User::query()
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('User/UserIndex', [
            'users' => $users
        ]);
    }

    public function store(StoreUserRequest $request)
    {
        $validated = $request->validated();
        $validated['password'] = Hash::make($validated['password']);
        
        // Use DB::raw for boolean value
        $validated['is_active'] = DB::raw($request->has('is_active') ? 'true' : 'false');
        
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('users', 'public');
            $validated['image'] = $path;
        }
        
        User::create($validated);

        return redirect()->back()
            ->with('success', 'User created successfully');
    }

    public function edit(User $user)
    {
        return Inertia::render('User/UserEdit', [
            'user' => $user
        ]);
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $validated = $request->validated();
        
        // Handle password
        if ($request->filled('password')) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        // Handle is_active
        $validated['is_active'] = $request->boolean('is_active');

        // Handle image upload
        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($user->image) {
                Storage::disk('public')->delete($user->image);
            }
            
            $path = $request->file('image')->store('users', 'public');
            $validated['image'] = $path;
        }

        // Update user
        $user->update($validated);

        return redirect()->route('users.index')
            ->with('success', 'User updated successfully');
    }

    public function destroy(User $user)
    {
        $user->delete();

        return redirect()->back()
            ->with('success', 'User deleted successfully');
    }
}
