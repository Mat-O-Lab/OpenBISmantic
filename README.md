# OpenBISmantic
Demonstrator of a Export Mechanism for OpenBIS Data to Sematic Data.

# Install

## create a .env file with
```bash
ADMIN_PASS=<adminpassw>
HOST_NAME=<fqurlofhost> (e.g., openbis.matolab.org)
OPENBIS_PORT=<port> (e.g., 80)
OPENBIS_SSL_PORT=<port> (e.g., 443)
GROUP_NAME=<groupname> (e.g., matolab)
GROUP_ID=<gid> (e.g., 12940)
```

## Run Server
```bash
docker-compose up
```

## Data retention
The current configuration is intended to **not** support data retention. If required, please add to `docker-compose.yml` the following lines:
```
    openbis:
        ...
        volumes:
        - openbis_vol:/home/openbis/openbis_state
    
volumes:
    openbis_vol:
        name: openbis_vol

```