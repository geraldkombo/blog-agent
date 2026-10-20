#!/bin/sh
# minimal daily loop: run at 05:30 UTC
while true; do
  NOW=$(date -u +%H%M)
  if [ "$NOW" -ge 0530 ] && [ "$NOW" -lt 0545 ] && [ ! -f "/tmp/ran-$(date -u +%F)" ]; then
    node run.js once >> /tmp/blog.log 2>&1
    touch "/tmp/ran-$(date -u +%F)"
  fi
  sleep 300
done
