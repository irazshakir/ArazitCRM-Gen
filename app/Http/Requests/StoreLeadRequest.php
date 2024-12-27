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
        $data = [
            'lead_active_status' => true, // Always set to true for new leads
        ];

        // Ensure string fields are properly formatted
        if ($this->has('name')) {
            $data['name'] = trim(strval($this->input('name')));
        }
        if ($this->has('phone')) {
            $data['phone'] = trim(strval($this->input('phone')));
        }
        if ($this->has('lead_source')) {
            $data['lead_source'] = trim(strval($this->input('lead_source')));
        }
        if ($this->has('lead_status')) {
            $data['lead_status'] = trim(strval($this->input('lead_status')));
        }
        if ($this->has('initial_remarks')) {
            $data['initial_remarks'] = trim(strval($this->input('initial_remarks')));
        }
        if ($this->has('followup_hour')) {
            $data['followup_hour'] = trim(strval($this->input('followup_hour')));
        }
        if ($this->has('followup_minute')) {
            $data['followup_minute'] = trim(strval($this->input('followup_minute')));
        }
        if ($this->has('followup_period')) {
            $data['followup_period'] = trim(strtoupper(strval($this->input('followup_period'))));
        }

        // Ensure numeric fields are properly formatted
        if ($this->has('assigned_user_id')) {
            $data['assigned_user_id'] = intval($this->input('assigned_user_id'));
        }
        if ($this->has('product_id')) {
            $data['product_id'] = intval($this->input('product_id'));
        }

        $this->merge($data);
    }
}
