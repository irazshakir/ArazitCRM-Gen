#!/bin/bash

# This script will be used for the cPanel cron job

# Get the absolute path of the project directory
PROJECT_PATH=$(dirname $(readlink -f $0))

# Start the queue worker
/usr/local/bin/php $PROJECT_PATH/artisan queue:work --daemon --tries=3 --sleep=3 >> $PROJECT_PATH/storage/logs/queue-worker.log 2>&1
