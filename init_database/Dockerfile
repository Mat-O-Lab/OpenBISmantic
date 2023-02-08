FROM continuumio/miniconda3

ADD ./examples /examples
WORKDIR /examples

ADD ./entrypoint.sh ./entrypoint.sh

ENTRYPOINT [ "./entrypoint.sh" ]