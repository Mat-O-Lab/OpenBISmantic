#!/bin/bash

echo "started init_database"

echo "activate lebeDigital conda env"
. /opt/conda/etc/profile.d/conda.sh
conda activate lebedigital

echo "uploading data"
# upload data
cd /examples/LebeDigital/usecases/MinimumWorkingExample
pip install pydoit

echo "uploading data"
#monkey patch to disable ssl cert verify - not working
sed -i 's/verify_certificates=True,/verify_certificates=False,/g' /examples/LebeDigital/lebedigital/openbis/interbis.py

echo "https://$SERVER_HOST_PORT/openbis/"
## doit runson=notactions url=https://openbis.matolab.org/openbis/ space=EMODUL user=admin force=yes mode=full # with password prompt
doit runson=notactions url=https://$SERVER_HOST_PORT/openbis/ space=EMODUL user=admin pw=${ADMIN_PASS} force=yes mode=full
