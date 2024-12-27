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
        Schema::create('lead_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('activity_type', [
                'note_added',
                'document_uploaded',
                'status_updated',
                'field_updated',
                'lead_assigned',
                'lead_closed',
                'lead_won',
                'followup_scheduled'
            ]);
            $table->json('activity_details')->nullable(); // Store additional details about the activity
            $table->timestamps();

            // Add indexes for better query performance
            $table->index(['lead_id', 'user_id', 'created_at']);
            $table->index('activity_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_activity_logs');
    }
};
