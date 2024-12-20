<?php

// Script to check if queue worker is running and restart if needed
$output = [];
exec('ps aux | grep "[p]hp.*artisan queue:work"', $output);

if (empty($output)) {
    // Queue worker not running, start it
    $command = 'bash ' . __DIR__ . '/queue-worker.sh > /dev/null 2>&1 &';
    exec($command);
    
    // Log the restart
    file_put_contents(
        __DIR__ . '/storage/logs/queue-monitor.log',
        date('Y-m-d H:i:s') . " - Queue worker restarted\n",
        FILE_APPEND
    );
}
