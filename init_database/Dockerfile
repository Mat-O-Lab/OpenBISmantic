FROM python:3.9-slim

RUN apt-get update && \
    apt-get install -y \
        build-essential \
        make \
        gcc

#install requirements
ADD ./requirements.pip /requirements.pip
RUN pip install -r requirements.pip 

#cleanup
RUN apt-get remove -y --purge make gcc build-essential \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

ADD ./examples /examples
WORKDIR /examples/LebeDigital
ENV PYTHONPATH="${PYTHONPATH}:/examples/LebeDigital"

ADD ./entrypoint.sh ./entrypoint.sh
ENTRYPOINT [ "./entrypoint.sh" ]