# openBISmantic
Demonstrator of a Export Mechanism for openBIS Data to Semantic Data.

# Install

## pull repository
```bash
git clone https://github.com/Mat-O-Lab/OpenBISmantic.git
cd OpenBISmantic
```
## create a .env file with
```bash

ADMIN_PASS=<adminpassw>
HOST_NAME=<fqurlofhost> (e.g., openbis.matolab.org)
OPENBIS_PORT=<port> (e.g., 80)
OPENBIS_SSL_PORT=<port> (e.g., 443)
GROUP_NAME=<groupname> (e.g., matolab)
GROUP_ID=<gid> (e.g., 12940)
REPO_DIR=<lwd> (e.g., ~/OpenBISmantic)
```
## pull plugin submodule
To clone the submodule:
```bash
cd OpenBISmantic-plugin
git submodule update --init --recursive
cd ..
```

## run server
```bash
docker compose up -d
```

## stop server and clean up
```bash
docker compose down
docker system prune --all
```

# Notes

## data retention
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