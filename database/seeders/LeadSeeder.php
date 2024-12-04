<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;
use Carbon\Carbon;

class LeadSeeder extends Seeder
{
    private array $pakistaniFirstNames = [
        'Muhammad', 'Ahmad', 'Ali', 'Hassan', 'Hussain', 'Usman', 'Imran',
        'Amir', 'Bilal', 'Faisal', 'Kashif', 'Nasir', 'Omar', 'Raheel',
        'Saad', 'Tariq', 'Waseem', 'Yasir', 'Zafar', 'Abdullah'
    ];

    private array $pakistaniLastNames = [
        'Khan', 'Ahmed', 'Ali', 'Malik', 'Qureshi', 'Syed', 'Sheikh',
        'Mahmood', 'Raza', 'Hussain', 'Shah', 'Butt', 'Dar', 'Rashid',
        'Mirza', 'Baig', 'Nawaz', 'Iqbal', 'Hassan', 'Abbasi'
    ];

    private array $companies = [
        'techzone', 'smartsol', 'nexustech', 'innovate', 'cybernet',
        'systemsltd', 'infoway', 'digitaledge', 'cloudpro', 'webexpert'
    ];

    public function run(): void
    {
        $faker = Faker::create();
        
        // Get sales consultant users
        $salesConsultants = User::where('role', 'sales-consultant')->pluck('id')->toArray();
        
        // Get other users
        $otherUsers = User::where('role', '!=', 'sales-consultant')->pluck('id')->toArray();

        // Fallback if no users found
        if (empty($salesConsultants) || empty($otherUsers)) {
            throw new \Exception('No users found in the database. Please ensure users exist before running this seeder.');
        }

        $cities = ['Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Peshawar', 
                  'Gujrat', 'Gujranwala', 'Sialkot', 'Faisalabad', 'Multan', 'Others'];
        
        $leadStatuses = [
            'Won' => 15,
            'Non-Potential' => 20,
            'No-Reply' => 30,
            'Lost' => 10,
            'Initial Contact' => 5,
            'Query' => 5,
            'Negotiation' => 5,
            'Call-Back-Later' => 10
        ];

        $leadSources = [
            'Facebook' => 40,
            'Google-Ads' => 20,
            'SEO' => 10,
            'Instagram' => 5,
            'LinkedIn' => 5,
            'Whatsapp' => 5,
            'Youtube-Ads' => 5,
            'Direct-Call' => 2.5,
            'Twitter' => 2.5,
            'Client-Referral' => 2.5,
            'Personal-Referral' => 2.5
        ];

        for ($chunk = 0; $chunk < 10; $chunk++) {
            $leads = [];
            
            for ($i = 0; $i < 1000; $i++) {
                $isActive = $faker->boolean(60);
                $leadStatus = $this->getRandomWeighted($leadStatuses);
                $currentDate = Carbon::now();

                $lead = [
                    'name' => $faker->randomElement($this->pakistaniFirstNames) . ' ' . 
                             $faker->randomElement($this->pakistaniLastNames),
                    'email' => $faker->unique()->userName . '@' . 
                              $faker->randomElement($this->companies) . '.com',
                    'phone' => '923' . $faker->numberBetween(0, 9) . 
                              $faker->numerify('#######'),
                    'city' => $faker->randomElement($cities),
                    'assigned_user_id' => $faker->boolean(70) ? 
                        $faker->randomElement($salesConsultants) : 
                        $faker->randomElement($otherUsers),
                    'assigned_at' => $currentDate->subDays($faker->numberBetween(1, 60)),
                    'lead_status' => $leadStatus,
                    'lead_source' => $this->getRandomWeighted($leadSources),
                    'initial_remarks' => $faker->paragraph(),
                    'lead_active_status' => $isActive,
                    'notification_status' => $faker->boolean(30),
                    'closed_at' => !$isActive ? Carbon::now()
                        ->subDays($faker->numberBetween(0, 30)) : null,
                    'won_at' => $leadStatus === 'Won' ? Carbon::now()
                        ->subDays($faker->numberBetween(0, 30)) : null,
                    'followup_date' => $faker->boolean(90) ? 
                        $faker->dateTimeBetween('now', '2025-01-31') : 
                        $faker->dateTimeBetween('-1 month', 'now'),
                    'followup_hour' => $faker->numberBetween(1, 12),
                    'followup_minute' => $faker->numberBetween(0, 59),
                    'followup_period' => $faker->randomElement(['AM', 'PM']),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                $leads[] = $lead;
            }

            DB::table('leads')->insert($leads);
        }
    }

    private function getRandomWeighted(array $weights): string
    {
        $rand = mt_rand(1, 100);
        $total = 0;
        
        foreach ($weights as $item => $weight) {
            $total += $weight;
            if ($rand <= $total) {
                return $item;
            }
        }
        
        return array_key_first($weights);
    }
} 