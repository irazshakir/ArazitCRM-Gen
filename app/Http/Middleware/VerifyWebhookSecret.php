<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class VerifyWebhookSecret
{
    public function handle(Request $request, Closure $next)
    {
        $webhookSecret = env('MAKE_WEBHOOK_SECRET');
        
        if (empty($webhookSecret)) {
            \Log::error('Webhook secret not configured');
            return response()->json(['message' => 'Webhook not configured'], 500);
        }

        $providedSecret = $request->header('X-Webhook-Secret');
        
        if ($providedSecret !== $webhookSecret) {
            \Log::error('Invalid webhook secret', [
                'provided' => $providedSecret,
                'expected' => $webhookSecret
            ]);
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        return $next($request);
    }
}
