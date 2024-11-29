<?php

namespace App\Imports;

use App\Models\Lead;
use App\Models\User;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class LeadsImport implements ToModel, WithHeadingRow, WithValidation
{
    protected $skippedRows = 0;

    public function model(array $row)
    {
        try {
            // Check for existing lead with same phone or email
            $existingLead = Lead::where('phone', $row['phone'])
                ->orWhere('email', $row['email'] ?? ($row['phone'] . '@placeholder.com'))
                ->first();

            if ($existingLead) {
                $this->skippedRows++;
                Log::info('Skipping duplicate lead', [
                    'phone' => $row['phone'],
                    'email' => $row['email'] ?? ($row['phone'] . '@placeholder.com')
                ]);
                return null;
            }

            Log::info('Processing row', ['row_data' => $row]);

            // Convert phone to string if it's numeric
            $phone = is_numeric($row['phone']) ? (string)$row['phone'] : $row['phone'];

            // Convert followup hour and minute to strings if they're numeric
            $followupHour = is_numeric($row['followup_hour']) ? (string)$row['followup_hour'] : $row['followup_hour'];
            $followupMinute = is_numeric($row['followup_minute']) ? (string)$row['followup_minute'] : $row['followup_minute'];

            // Handle Excel date formats
            $followupDate = null;
            if (!empty($row['followup_date'])) {
                try {
                    // Check if the date is in Excel format (numeric)
                    if (is_numeric($row['followup_date'])) {
                        $followupDate = ExcelDate::excelToDateTimeObject($row['followup_date'])->format('Y-m-d');
                    } else {
                        // Try to parse as regular date string
                        $followupDate = Carbon::parse($row['followup_date'])->format('Y-m-d');
                    }
                } catch (\Exception $e) {
                    Log::error('Error parsing followup date', [
                        'date' => $row['followup_date'],
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Handle won_at date
            $wonAt = null;
            if (!empty($row['won_at'])) {
                try {
                    if (is_numeric($row['won_at'])) {
                        $wonAt = ExcelDate::excelToDateTimeObject($row['won_at']);
                    } else {
                        $wonAt = Carbon::parse($row['won_at']);
                    }
                } catch (\Exception $e) {
                    Log::error('Error parsing won_at date', [
                        'date' => $row['won_at'],
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Handle closed_at date
            $closedAt = null;
            if (!empty($row['closed_at'])) {
                try {
                    if (is_numeric($row['closed_at'])) {
                        $closedAt = ExcelDate::excelToDateTimeObject($row['closed_at']);
                    } else {
                        $closedAt = Carbon::parse($row['closed_at']);
                    }
                } catch (\Exception $e) {
                    Log::error('Error parsing closed_at date', [
                        'date' => $row['closed_at'],
                        'error' => $e->getMessage()
                    ]);
                }
            } elseif (in_array($row['lead_status'], ['Lost', 'Non-Potential'])) {
                $closedAt = now();
            }

            // Find assigned user ID from name
            $assignedUser = User::where('name', $row['assigned_user'])
                               ->where('is_active', true)
                               ->first();

            if (!$assignedUser) {
                Log::error('Assigned user not found', [
                    'user_name' => $row['assigned_user'],
                    'row_data' => $row
                ]);
                throw new \Exception("User {$row['assigned_user']} not found or inactive");
            }

            // Convert lead_active_status from text to boolean
            $isActive = strtolower(trim($row['lead_active_status'])) === 'open';

            Log::info('Creating lead', [
                'name' => $row['name'],
                'phone' => $phone,
                'assigned_user' => $assignedUser->name,
                'status' => $row['lead_status']
            ]);

            // Create the lead
            return new Lead([
                // Mandatory fields
                'name' => $row['name'],
                'phone' => $phone,
                'lead_source' => $row['lead_source'],
                'lead_status' => $row['lead_status'],
                'lead_active_status' => $isActive,
                'assigned_user_id' => $assignedUser->id,
                
                // Optional fields with defaults
                'email' => $row['email'] ?? $phone . '@placeholder.com',
                'city' => $row['city'] ?? 'Others',
                'closed_at' => $closedAt,
                'won_at' => $wonAt,
                'followup_date' => $followupDate,
                'followup_hour' => $followupHour,
                'followup_minute' => $followupMinute,
                'followup_period' => $row['followup_period'] ?? null,
                
                // System fields
                'assigned_at' => now(),
                'notification_status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('Error processing row', [
                'error' => $e->getMessage(),
                'row_data' => $row,
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    public function rules(): array
    {
        $rules = [
            '*.name' => ['required', 'string', 'max:255'],
            '*.phone' => ['required'],
            '*.lead_source' => ['required', 'in:' . implode(',', Lead::LEAD_SOURCES)],
            '*.lead_status' => ['required', 'in:' . implode(',', Lead::STATUSES)],
            '*.lead_active_status' => ['required', 'in:open,closed'],
            '*.assigned_user' => ['required', 'string'],
            
            // Optional fields validation
            '*.email' => ['nullable', 'email'],
            '*.city' => ['nullable', 'in:' . implode(',', Lead::CITIES)],
            '*.followup_date' => ['nullable'],
            '*.followup_hour' => ['nullable'],
            '*.followup_minute' => ['nullable'],
            '*.followup_period' => ['nullable', 'in:AM,PM'],
        ];

        Log::info('Validation rules', ['rules' => $rules]);
        return $rules;
    }

    public function customValidationMessages()
    {
        return [
            '*.name.required' => 'Name is required in row :attribute',
            '*.phone.required' => 'Phone is required in row :attribute',
            '*.phone.unique' => 'Phone number already exists in row :attribute',
            '*.lead_source.required' => 'Lead source is required in row :attribute',
            '*.lead_source.in' => 'Invalid lead source in row :attribute. Valid options: ' . implode(', ', Lead::LEAD_SOURCES),
            '*.lead_status.required' => 'Lead status is required in row :attribute',
            '*.lead_status.in' => 'Invalid lead status in row :attribute. Valid options: ' . implode(', ', Lead::STATUSES),
            '*.lead_active_status.required' => 'Lead active status is required in row :attribute',
            '*.lead_active_status.in' => 'Lead active status must be either "open" or "closed" in row :attribute',
            '*.assigned_user.required' => 'Assigned user is required in row :attribute',
            '*.email.email' => 'Invalid email format in row :attribute',
            '*.city.in' => 'Invalid city in row :attribute. Valid options: ' . implode(', ', Lead::CITIES),
            '*.followup_date.date' => 'Invalid followup date format in row :attribute',
            '*.followup_period.in' => 'Followup period must be either "AM" or "PM" in row :attribute',
        ];
    }

    public function getSkippedCount()
    {
        return $this->skippedRows;
    }
} 