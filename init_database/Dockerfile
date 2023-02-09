FROM continuumio/miniconda3

ADD ./examples /examples

WORKDIR /examples/LebeDigital

# Make RUN commands use `bash --login`:
SHELL ["/bin/bash", "--login", "-c"]

RUN conda env create -f environment.yml
# Activate the environment, and make sure it's activated:
WORKDIR /
# Initialize conda in bash config fiiles:
RUN conda init bash

ADD ./entrypoint.sh ./entrypoint.sh

ENTRYPOINT [ "./entrypoint.sh" ]