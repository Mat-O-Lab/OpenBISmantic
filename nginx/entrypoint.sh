#!/bin/bash

set -e

if [[ ! -d /etc/nginx/certs ]]; then
	mkdir -p /etc/nginx/certs
fi

if [[ ! -e /etc/nginx/certs/openbis.key ]]; then
	openssl req -new -x509 -nodes -days 365 -newkey rsa:4096 -subj "/C=DE/ST=Freiburg/L=BW/O=Fraunhofer/CN=IWM" \
		-keyout /etc/nginx/certs/openbis.key -out /etc/nginx/certs/openbis.crt
fi

exec "$@"
nginx -g "daemon off;"
