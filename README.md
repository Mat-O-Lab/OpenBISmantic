
# openBISmantic [![Publish Docker image](https://github.com/Mat-O-Lab/OpenBISmantic/actions/workflows/PublishContainer.yml/badge.svg)](https://github.com/Mat-O-Lab/OpenBISmantic/actions/workflows/PublishContainer.yml) ![Export Data](https://github.com/Mat-O-Lab/OpenBISmantic/actions/workflows/ExportData.yml/badge.svg)
Demonstrator of an Export Mechanism for openBIS Data to Semantic Data.

# This Repository
This repository contains the openBISmantic API as well as a demonstrator openBIS istance filled with data from the [LebeDigital](https://github.com/BAMresearch/LebeDigital) project.

# Prototype
```bash
URL: https://openbismantic.matolab.org/openbis/webapp/eln-lims
user: public-user
password: public
after login access the URL: https://openbismantic.matolab.org/openbismantic
![image](https://github.com/Mat-O-Lab/OpenBISmantic/assets/9248325/a88e19f3-00c5-4817-83c4-ed3f5cb9ce3b)
Click in "exporter"
Select some instance and click on the button "Load selected"
Then you can export the triples in .ttl format or run a SPARQL query.
```

# openBISmantic API
The openBISmantic API provices access to most entities in your openBIS instance as linked RDF.
To do that, it defines persistent, resolvable IRIs using their Openbis permIds.  

# Setting Up the Demo Installation

## pull repository
```bash
git clone https://github.com/Mat-O-Lab/OpenBISmantic.git
cd OpenBISmantic
```
## create a .env file with
```bash
ADMIN_PASS=<adminpassw>
OBSERVER_PASS=<observerpassw>
HOST_NAME=<fqurlofhost> (e.g., openbis.matolab.org)
OPENBIS_PORT=<port> (e.g., 80)
OPENBIS_SSL_PORT=<port> (e.g., 443)
POSTGRES_PASSWORD=<postgrespassw>
GROUP_NAME=<groupname> (e.g., matolab)
GROUP_ID=<gid> (e.g., 12940)
OPENBISMANTIC_URL=<url> (e.g., https://openbis.matolab.org)
```

## run server
```bash
docker compose up -d
```
This should set up the demo instance with example data.
The openbismantic API is accessible on `/openbismantic`.

## stop server and clean up
```bash
docker compose down
docker system prune --all
```

# Running the openBISmantic API With an Existing Instance of Openbis
The openBISmantic API can be started on its own and connect to an existing Openbis instance.
It is controlled with environmental variables.

Example:
```bash
OPENBIS_URL=https://openbis.iwm.fraunhofer.de \
BASE_URL=https://openbis.iwm.fraunhofer.de \
uvicorn app:app
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
