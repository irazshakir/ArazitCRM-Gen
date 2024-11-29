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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->onDelete('cascade');
            $table->string('invoice_number')->unique();
            $table->string('company_name');
            $table->string('company_logo')->nullable();
            $table->decimal('total_amount', 10);
            $table->decimal('amount_received', 10)->default(0);
            $table->decimal('amount_remaining', 10);
            $table->enum('status', ['draft', 'pending', 'partially_paid', 'paid', 'cancelled'])
                  ->default('draft');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('updated_by')->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice');
    }
};
