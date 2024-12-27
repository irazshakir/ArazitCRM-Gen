<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Lead;

class UpdateLeadRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:255',
            'city' => 'required|string|in:' . implode(',', Lead::CITIES),
            'assigned_user_id' => 'nullable|exists:users,id',
            'lead_status' => 'required|string|in:' . implode(',', Lead::STATUSES),
            'lead_source' => 'required|string|in:' . implode(',', Lead::LEAD_SOURCES),
            'initial_remarks' => 'nullable|string',
            'followup_date' => 'nullable|date',
            'followup_hour' => 'nullable|string',
            'followup_minute' => 'nullable|string',
            'followup_period' => 'nullable|in:AM,PM',
            'lead_active_status' => 'required|in:true,false',
            'product_id' => 'nullable|exists:products,id',
        ];
    }
}
