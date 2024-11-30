<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAccountRequest extends FormRequest
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
            'payment_type' => ['required', 'in:Received,Refunded,Expenses,Vendor Payment'],
            'payment_mode' => ['required', 'in:Cash,Online,Cheque'],
            'transaction_type' => ['required', 'in:Debit,Credit'],
            'amount' => ['required', 'numeric', 'min:0'],
            'vendor_name' => ['required_if:payment_type,Vendor Payment'],
            'invoice_id' => ['required_if:payment_type,Received', 'exists:invoices,id'],
            'document' => ['nullable', 'file'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
