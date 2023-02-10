#!/bin/bash

echo "started init_database"
#monkey patch to disable ssl cert verify - not working
echo "monkey patching to disable certificate verification"
sed -i 's/verify_certificates=True,/verify_certificates=False,/g' /examples/LebeDigital/lebedigital/openbis/interbis.py

echo "check if login works"
python << END
import os
from pybis import Openbis
# Get environment variables
SERVER_HOST_PORT = os.getenv('SERVER_HOST_PORT')
ADMIN_PASS = os.environ.get('ADMIN_PASS')
o = Openbis(SERVER_HOST_PORT,verify_certificates=False)
print(o.login('admin', ADMIN_PASS, save_token=True))
END
if [ $? -eq 0 ]
then
  echo "Successfully login."
else
  # Redirect stdout from echo command to stderr.
  echo "Login not working. Sleeping 30s then exit"
  sleep 30s
  exit 13;
fi

echo "uploading data"
# upload data
cd /examples/LebeDigital/usecases/MinimumWorkingExample
echo "https://$SERVER_HOST_PORT/openbis/"
## doit runson=notactions url=https://openbis.matolab.org/openbis/ space=EMODUL user=admin force=yes mode=full # with password prompt
doit runson=notactions url=https://$SERVER_HOST_PORT/openbis/ space=EMODUL user=admin pw=${ADMIN_PASS} force=yes mode=full
exit 0