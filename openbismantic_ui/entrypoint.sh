#!/bin/bash

set -e

config='{}'
for key in $(jq -r 'keys_unsorted|join(" ")' /app/src/assets/config.json); do
  config="$(echo $config | jq --arg key "$key" --arg value "${!key}" '. + {($key): $value'})"
done

if [ -z ${DEV_SERVER} ]; then
  echo $config | jq > /usr/share/nginx/html/openbismantic/ui/assets/config.json
  nginx -g "daemon off;"
else
  echo $config | jq > src/assets/config.json
  ng serve -c development --host 0.0.0.0 --port 80 --serve-path /openbismantic/ui/ --disable-host-check --live-reload=false
fi
