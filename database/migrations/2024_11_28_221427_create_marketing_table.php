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
        Schema::create('marketing', function (Blueprint $table) {
            $table->id();
            $table->string('campaign_name');
            $table->decimal('cost', 10);
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
            ])->default('Facebook'); // Optional: cascade delete
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('campaign_status')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('marketing');
    }
};
