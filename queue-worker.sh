#!/bin/bash

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Kill any existing queue workers for this project
ps aux | grep "[p]hp.*artisan queue:work" | awk '{print $2}' | xargs -r kill -9

# Start the queue worker
cd $DIR
/usr/local/bin/php artisan queue:work --daemon --tries=3 --sleep=3 >> storage/logs/queue-worker.log 2>&1 &
