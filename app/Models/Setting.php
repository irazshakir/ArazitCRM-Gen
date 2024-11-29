<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = [
        'company_name',
        'company_phone',
        'company_email',
        'company_address',
        'company_logo',
    ];

    public static function getSettings()
    {
        return Cache::remember('company_settings', 3600, function () {
            return self::first();
        });
    }

    protected static function boot()
    {
        parent::boot();

        static::saved(function ($settings) {
            Cache::forget('company_settings');
        });
    }
}
