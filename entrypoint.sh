#!/bin/bash

set -e
localedef -i en_US -f UTF-8 en_US.UTF-8
export PGDATA=/home/openbis/openbis_state/postgresql_data
dssStore=/home/openbis/openbis_state/dss_store

stop_postgres() {
  echo "Running postgres pg_ctl -D $PGDATA -m fast -w stop"
  gosu postgres pg_ctl -D "$PGDATA" -m fast -w stop
}

start_postgres() {
  echo 'Starting postgres'
  exec gosu postgres "$@" &
	echo 'Giving 10 seconds to postgres to start before starting openBIS'
	sleep 10s
}

stop_openbis() {
  echo 'Running alldown.sh'
	gosu openbis /home/openbis/openbis/bin/alldown.sh
}

start_openbis() {
  echo 'Running allup.sh'
  gosu openbis /home/openbis/openbis/bin/allup.sh
}

set_data_folder_rights() {
  echo "Recursively changing the owner of the directory '$PGDATA' to postgres and '/home/openbis/openbis_state' to 'openbis:$GROUP_NAME'."
  chown -R openbis:"$GROUP_NAME" /home/openbis/openbis_state
  chown -R postgres "$PGDATA"
  chmod -R 2700 "$PGDATA"
}

clear_data_folder_rights() {
  if [[ -n "${GROUP_NAME}" ]]; then
      echo "Recursively changing the owner of the directory '$PGDATA' and '/home/openbis/openbis_state' to 'openbis:$GROUP_NAME'."
      chown -R openbis:"$GROUP_NAME" /home/openbis/openbis_state
      chown -R openbis:"$GROUP_NAME" "$PGDATA"
  fi
}

# SIGTERM-handler
term_handler() {
	set +e

	echo 'Gracefully shutting down.'

	stop_openbis
	stop_postgres

	echo "Checking if GROUP_NAME is empty. GROUP_NAME=$GROUP_NAME"
	# Making sure all permissions are set even after the server is down.
  clear_data_folder_rights

  echo "Recursively changing permissions to the directory /home/openbis/openbis_state"
  chmod -R 2777 /home/openbis/openbis_state

	exit 0
}

# ERR-handler
err_handler() {
  set +e

  clear_data_folder_rights

  echo "Error $1 occurred on $2"
  echo "Recursively changing permissions to the directory /home/openbis/openbis_state"
  chmod -R 2777 /home/openbis/openbis_state

  exit 1
}

# usage: file_env VAR [DEFAULT]
#    ie: file_env 'XYZ_DB_PASSWORD' 'example'
# (will allow for "$XYZ_DB_PASSWORD_FILE" to fill in the value of
#  "$XYZ_DB_PASSWORD" from a file, especially for Docker's secrets feature)
file_env() {
	local var="$1"
	local fileVar="${var}_FILE"
	local def="${2:-}"
	if [[ "${!var:-}" ]] && [[ "${!fileVar:-}" ]]; then
		echo >&2 "error: both $var and $fileVar are set (but are exclusive)"
		exit 1
	fi
	local val="$def"
	if [ "${!var:-}" ]; then
		val="${!var}"
	elif [ "${!fileVar:-}" ]; then
		val="$(< "${!fileVar}")"
	fi
	export "$var"="$val"
	unset "$fileVar"
}

is_link_to_fodler() {
  if [[ -L "$1" && -d "$1" ]]; then
    return 0
  else
    return 1
  fi
}

# Updating DSS download-url environment to provide downloads through APIs
link_target='/home/openbis/openbis/servers/datastore_server/etc'
service_properties_file="${link_target}/service.properties"
if [[ -z "${SERVER_HOST_PORT}" ]]; then
	echo "DSS download-url is empty"
else
  if [[ ! (-f "${service_properties_file}") ]]; then
  	echo "service.properties file not found"
  else
    sedinput="s/^download-url.*/download-url = https:\/\/$SERVER_HOST_PORT/g"
    sed -i "$sedinput" "${service_properties_file}"
    echo "DSS download-url updated to https://"$SERVER_HOST_PORT
	fi
fi

if [[ -n "${GROUP_NAME}" ]]; then
  getent group "${GROUP_NAME}" || groupadd -f -g $GROUP_ID $GROUP_NAME
fi

if [[ -f "/home/openbis/openbis_state/openbis_prod" ]] && [[ -f "/home/openbis/openbis_state/pathinfo_prod" ]]; then
  echo "Found openbis_prod and pathinfo_prod dumps, restoring them"
  if [[ -d "$PGDATA" ]]; then
    mv "$PGDATA" "$PGDATA"$(date +"%Y%m%d.%H%M%S")
    mkdir "$PGDATA"
  fi
else
  if [[ -d "$PGDATA" ]]; then
    echo "Using existing openbis_state"
  else
    echo "Creating new openbis_state"
    unzip -o /home/openbis/openbis_state_template.zip -d /home/openbis
  fi
fi

link_target='/home/openbis/openbis/servers/openBIS-server/jetty/logs'
if ! is_link_to_fodler "$link_target"; then
  echo "Creating link to jetty/logs"
  rm -rf "$link_target"
  ln -s /home/openbis/openbis_state/as_logs "$link_target"
fi

link_target='/home/openbis/store'
if ! is_link_to_fodler "$link_target"; then
  echo "Creating link to openbis/store"
  rm -rf "$link_target"
  ln -s "$dssStore" "$link_target"
fi

link_target='/home/openbis/openbis/servers/datastore_server/data/sessionWorkspace'
if ! is_link_to_fodler "$link_target"; then
  echo "Creating link to datastore_server/data/sessionWorkspace"
  rm -rf "$link_target"
  ln -s /home/openbis/openbis_state/dss_session_workspace "$link_target"
fi

link_target='/home/openbis/openbis/servers/datastore_server/log'
if ! is_link_to_fodler "$link_target"; then
  echo "Creating link to datastore_server/log"
  rm -rf "$link_target"
  ln -s /home/openbis/openbis_state/dss_logs "$link_target"
fi

link_target='/home/openbis/openbis/servers/openBIS-server/jetty/etc'
if ! is_link_to_fodler "$link_target"; then
  echo "Moving contents of the etc folder of AS to the state directory without overwriting"
  mv -n "$link_target"/* /home/openbis/openbis_state/as_etc
  rm -rf "$link_target"
  ln -s /home/openbis/openbis_state/as_etc "$link_target"
fi

link_target='/home/openbis/openbis/servers/datastore_server/etc'
if ! is_link_to_fodler "$link_target"; then
  echo "Moving contents of the etc folder of DSS to the state directory without overwriting"
  mv -n "$link_target"/* /home/openbis/openbis_state/dss_etc
  rm -rf "$link_target"
  ln -s /home/openbis/openbis_state/dss_etc "$link_target"
fi

link_target='/etc/pki/tls'
if ! is_link_to_fodler "$link_target"; then
  echo "Moving contents of the folders with TLS certificates to the state directory without overwriting"
  mkdir -p /home/openbis/openbis_state/cert
  mv -n "$link_target"/* /home/openbis/openbis_state/cert
  rm -rf "$link_target"
  ln -s /home/openbis/openbis_state/cert "$link_target"
fi

link_target='/home/openbis/openbis/servers/openBIS-server/jetty/indices'
if ! is_link_to_fodler "$link_target"; then
  echo "Moving contents of the folder with indices to the state directory without overwriting"
  mkdir -p /home/openbis/openbis_state/as_indices
  ln -s /home/openbis/openbis_state/as_indices "$link_target"
fi

# Configuring core plugins
existingPluginsDir="/home/openbis/openbis/servers/core-plugins"
mountedPluingsDir="/home/openbis/openbis_state/core-plugins"
if [[ -d "$mountedPluingsDir" ]]; then
  echo "Mounting core-plugins folder on openbis_state: found"
  srcDir="$existingPluginsDir"
  dstDir="$mountedPluingsDir"
  cd "$srcDir"
  for f in *; do
      if [[ -d "$f" ]]; then
          if [[ ! -d "$dstDir/$f" ]]; then
              cp -r "$f" "$dstDir"
          fi
      fi
  done
  cd ..
else
	echo "Mounting core-plugins folder on openbis_state: copying"
	cp -rf "$existingPluginsDir" "$mountedPluingsDir"
fi

rm -rf "$existingPluginsDir"
ln -s "$mountedPluingsDir" "$existingPluginsDir"
echo "Mounting core-plugins folder on openbis_state: linked"

pluginsPropertiesFile="/home/openbis/openbis_state/core-plugins/core-plugins.properties"
if [[ -n "${CORE_PLUGINS}" ]]; then
    echo "$CORE_PLUGINS" > "$pluginsPropertiesFile"
    echo "Core plugins configuration set"
elif [[ ! -f "$pluginsPropertiesFile" ]]; then
    echo "enabled-modules = dropbox-monitor, dataset-uploader, dataset-file-search, xls-import, openbis-sync, eln-lims, openbis-ng-ui, search-store" > "$pluginsPropertiesFile"
    echo "Core plugins default configuration set"
fi

# Setting folder rights before starting the system
set_data_folder_rights

if [[ "${1:0:1}" = '-' ]]; then
	set -- postgres "$@"
fi

if [[ "$1" = 'postgres' ]]; then
  echo "Creating directories $PGDATA and /run/postgresql."
	mkdir -p "$PGDATA"
	mkdir -p /run/postgresql
	chmod g+s /run/postgresql
	chown -R postgres /run/postgresql

	# look specifically for PG_VERSION, as it is expected in the DB dir
	if [[ ! -s "$PGDATA/PG_VERSION" ]]; then
	  echo "File $PGDATA/PG_VERSION exists."

		file_env 'POSTGRES_INITDB_ARGS'
		eval "gosu postgres initdb --no-locale --encoding=UTF8 $POSTGRES_INITDB_ARGS"

		# check password first so we can output the warning before postgres
		# messes it up
		file_env 'POSTGRES_PASSWORD'
		if [[ "$POSTGRES_PASSWORD" ]]; then
			pass="PASSWORD '$POSTGRES_PASSWORD'"
			authMethod=md5
		else
			# The - option suppresses leading tabs but *not* spaces. :)
			cat >&2 <<-'EOWARN'
				****************************************************
				WARNING: No password has been set for the database.
				         This will allow anyone with access to the
				         Postgres port to access your database. In
				         Docker's default configuration, this is
				         effectively any other container on the same
				         system.

				         Use "-e POSTGRES_PASSWORD=password" to set
				         it in "docker run".
				****************************************************
			EOWARN

			pass=
			authMethod=trust
		fi

		{ echo; echo "host all all all $authMethod"; } | gosu postgres tee -a "$PGDATA/pg_hba.conf" > /dev/null

		# internal start of server in order to allow set-up using psql-client
		gosu postgres pg_ctl -D "$PGDATA" \
			-o "-c listen_addresses='localhost'" \
			-w start

		file_env 'POSTGRES_USER' 'postgres'
		file_env 'POSTGRES_DB' "$POSTGRES_USER"

		psql=( psql -v ON_ERROR_STOP=1 )

		if [[ "$POSTGRES_DB" != 'postgres' ]]; then
			"${psql[@]}" --username postgres <<-EOSQL
				CREATE DATABASE "$POSTGRES_DB" ;
			EOSQL
			echo
		fi

		if [[ "$POSTGRES_USER" = 'postgres' ]]; then
			op='ALTER'
		else
			op='CREATE'
		fi
		"${psql[@]}" --username postgres <<-EOSQL
			$op USER "$POSTGRES_USER" WITH SUPERUSER $pass ;
		EOSQL
		echo

		psql+=( --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" )

		echo
		for f in /docker-entrypoint-initdb.d/*; do
			case "$f" in
				*.sh)     echo "$0: running $f"; . "$f" ;;
				*.sql)    echo "$0: running $f"; "${psql[@]}" -f "$f"; echo ;;
				*.sql.gz) echo "$0: running $f"; gunzip -c "$f" | "${psql[@]}"; echo ;;
				*)        echo "$0: ignoring $f" ;;
			esac
			echo
		done

		stop_postgres

		echo
		echo 'PostgreSQL init process complete; ready for start up.'
		echo
	fi

  start_postgres "$@"

  trap 'term_handler' SIGTERM
	trap 'err_handler $? $LINENO' ERR

  if [[ -f "/home/openbis/openbis_state/openbis_prod" ]] && [[ -f "/home/openbis/openbis_state/pathinfo_prod" ]]; then
    echo 'Restoring Dumps.'
    echo 'Restoring Dumps - Creating users: openbis, openbis_readonly'
    /usr/bin/createuser --superuser -U postgres openbis
    /usr/bin/createuser -U postgres openbis_readonly
    echo 'Restoring Dump - openbis_prod'
    /usr/bin/createdb -U openbis -O openbis openbis_prod
    /usr/bin/psql -U openbis -d openbis_prod -c 'drop schema if exists public;'
    /usr/bin/pg_restore -U openbis -d openbis_prod /home/openbis/openbis_state/openbis_prod
    echo 'Restoring Dump - pathinfo_prod'
    /usr/bin/createdb -U openbis -O openbis pathinfo_prod
    /usr/bin/psql -U openbis -d pathinfo_prod -c 'drop schema if exists public;'
    /usr/bin/pg_restore -U openbis -d pathinfo_prod /home/openbis/openbis_state/pathinfo_prod
  fi

	echo 'Apache starting'
	exec /etc/init.d/apache2 restart &

  start_openbis

	echo 'All services launched, waiting for SIGTERM signal.'
	echo 'Please use: docker stop <CONTAINER ID>'
	while :; do sleep 1; done & kill -STOP $! && wait $!
fi

exec "$@"
