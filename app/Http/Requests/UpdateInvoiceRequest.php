<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInvoiceRequest extends FormRequest
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
            'lead_id' => 'required|exists:leads,id',
            'invoice_number' => 'required|string|unique:invoices,invoice_number,' . $this->invoice->id,
            'total_amount' => 'required|numeric|min:0',
            'amount_received' => 'required|numeric|min:0',
            'amount_remaining' => 'required|numeric|min:0',
            'status' => 'required|in:draft,pending,partially_paid,paid,cancelled',
            'notes' => 'nullable|string',
            'invoice_items' => 'required|array|min:1',
            'invoice_items.*.service_name' => 'required|string',
            'invoice_items.*.description' => 'nullable|string',
            'invoice_items.*.amount' => 'required|numeric|min:0',
        ];
    }
}
