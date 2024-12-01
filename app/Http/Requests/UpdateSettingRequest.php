<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingRequest extends FormRequest
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
            'company_name' => 'sometimes|required|string|max:255',
            'company_phone' => 'sometimes|required|string|max:255',
            'company_email' => 'sometimes|required|email|max:255',
            'company_address' => 'sometimes|required|string',
            'company_logo' => 'sometimes|image|mimes:jpeg,png,jpg|max:2048',
        ];
    }
}
