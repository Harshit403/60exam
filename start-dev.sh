#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting Next.js dev server..."
  npx next dev -p 3000 2>&1 | tee /home/z/my-project/dev.log
  echo "Server exited, restarting in 3 seconds..."
  sleep 3
done
