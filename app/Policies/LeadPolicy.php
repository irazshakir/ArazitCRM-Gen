<?php

namespace App\Policies;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class LeadPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view the lead.
     */
    public function view(User $user, Lead $lead): bool
    {
        // Allow if user is assigned to the lead or is an admin/manager
        return $user->id === $lead->assigned_user_id || 
               in_array($user->role, ['admin', 'manager']);
    }

    /**
     * Determine whether the user can update the lead.
     */
    public function update(User $user, Lead $lead): bool
    {
        // Allow if user is assigned to the lead or is an admin/manager
        return $user->id === $lead->assigned_user_id || 
               in_array($user->role, ['admin', 'manager']);
    }

    /**
     * Determine whether the user can create leads.
     */
    public function create(User $user): bool
    {
        // Allow if user has sales consultant role or is an admin/manager
        return in_array($user->role, ['sales-consultant', 'admin', 'manager']);
    }

    /**
     * Determine whether the user can delete the lead.
     */
    public function delete(User $user, Lead $lead): bool
    {
        // Only allow admins to delete leads
        return $user->role === 'admin';
    }
}
