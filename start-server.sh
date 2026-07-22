#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting Next.js server..."
  npx next dev -p 3000 2>&1 | tee -a /home/z/my-project/dev.log
  EXIT_CODE=$?
  echo "Server exited with code $EXIT_CODE, restarting in 3 seconds..."
  sleep 3
done
