#!/bin/bash
echo "started init_database"

echo "import lebeDigital data"
git clone https://github.com/BAMresearch/LebeDigital.git lebeDigital
cd lebeDigital

echo "building conda environment"
# build enviroment
conda env create -f environment.yml
source ~/miniconda3/etc/profile.d/conda.sh
conda activate lebedigital

echo "uploading data"
# upload data
cd usecases/MinimumWorkingExample
## doit runson=notactions url=https://openbis.matolab.org/openbis/ space=EMODUL user=admin force=yes mode=full # with password prompt
doit runson=notactions url=https://$HOST_NAME:$OPENBIS_PORT/openbis/ space=EMODUL user=admin pw=${ADMIN_PASS} force=yes mode=full
