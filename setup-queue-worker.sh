#!/bin/bash

# Create jobs table and run migrations
php artisan queue:table
php artisan migrate

# Install Supervisor
sudo apt-get update
sudo apt-get install -y supervisor

# Create Supervisor configuration
sudo tee /etc/supervisor/conf.d/laravel-worker.conf << EOF
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php $PWD/artisan queue:work --sleep=3 --tries=3 --max-time=3600
directory=$PWD
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=$PWD/storage/logs/worker.log
stopwaitsecs=3600
EOF

# Reload Supervisor configuration
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start laravel-worker:*

# Show status
sudo supervisorctl status

echo "Queue worker setup complete. Check status with: sudo supervisorctl status"
