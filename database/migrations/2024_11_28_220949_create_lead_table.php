<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone')->unique();

            // Using enum for fixed values ensures data integrity
            $table->enum('city', [
                'Lahore', 'Islamabad', 'Karachi', 'Rawalpindi',
                'Peshawar', 'Gujrat', 'Gujranwala', 'Sialkot',
                'Faisalabad', 'Multan', 'Others'
            ]);

            $table->foreignId('assigned_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
                
            $table->timestamp('assigned_at')->nullable();
            
            $table->enum('lead_status', [
                'Initial Contact',
                'Query',
                'Negotiation',
                'Won',
                'Lost',
                'Non-Potential',
                'No-Reply',
                'Call-Back-Later'
            ])->default('Query');

            $table->enum('lead_source', [
                'Facebook',
                'Instagram',
                'LinkedIn',
                'Whatsapp',
                'Google-Ads',
                'Youtube-Ads',
                'SEO',
                'Direct-Call',
                'Twitter',
                'Client-Referral',
                'Personal-Referral',
                'Others'
            ])->default('Facebook');
            
            
            $table->text('initial_remarks')->nullable();
            $table->boolean('lead_active_status')->default(true);
            $table->boolean('notification_status')->default(false);
            
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('won_at')->nullable();
            
            // Followup time components
            $table->date('followup_date')->nullable();
            $table->tinyInteger('followup_hour')->nullable();
            $table->tinyInteger('followup_minute')->nullable();
            $table->enum('followup_period', ['AM', 'PM'])->nullable();
            
            $table->timestamps();

            // Indexes for frequently queried columns
            $table->index('lead_status');
            $table->index('lead_active_status');
            $table->index('followup_date');
            $table->index(['assigned_user_id', 'lead_status']);

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
