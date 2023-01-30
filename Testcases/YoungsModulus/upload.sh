#!/bin/bash

# variables from .env should be exported e.g. by running > export $(grep -v '^#' .env | xargs) in repo home
# miniconda3 has to be installed!
############

# update Lebedigital repo (added as submodule ones)
# git submodule add https://github.com/BAMresearch/LebeDigital.git
git submodule update --init
cd LebeDigital

# change branch
git checkout 56-open-bis-integration-derived-sample # temporally soon main!!
git pull
# build enviroment
conda env create -f environment.yml
source ~/miniconda3/etc/profile.d/conda.sh
conda activate lebedigital

# upload data
cd usecases/MinimumWorkingExample
## doit runson=notactions url=https://openbis.matolab.org/openbis/ space=EMODUL user=admin force=yes mode=full # with password prompt
doit runson=notactions url=https://openbis.matolab.org/openbis/ space=EMODUL user=admin pw=${ADMIN_PASS} force=yes mode=full

conda deactivate
