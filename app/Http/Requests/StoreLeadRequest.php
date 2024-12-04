<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLeadRequest extends FormRequest
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
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email|max:255',
            'assigned_user_id' => 'required|exists:users,id',
            'lead_source' => 'required|string',
            'lead_status' => 'nullable|string',
            'initial_remarks' => 'nullable|string',
            'followup_date' => 'nullable|date',
            'followup_hour' => 'nullable|string',
            'followup_minute' => 'nullable|string',
            'followup_period' => 'nullable|in:AM,PM',
            'lead_active_status' => 'boolean',
            'city' => 'nullable|string',
            'product_id' => 'nullable|exists:products,id',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation()
    {
        $this->merge([
            'lead_active_status' => true, // Always set to true for new leads
        ]);
    }
}
