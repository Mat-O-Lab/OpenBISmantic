FROM docker.io/openbis/debian-openbis:latest

WORKDIR /home/openbis/openbis/servers
#setup behind proxy
RUN cp ./openBIS-server/jetty-dist/demo-base/start.d/http.ini ./openBIS-server/jetty/start.d/
COPY ./datastore_service/service.properties ./datastore_server/etc/service.properties
COPY ./openbis-server/service.properties ./openBIS-server/jetty/etc/service.properties
#install openbismatic plugin
# COPY ./OpenBISmantic-plugin ./core-plugins/openbismantic
ADD ./OpenBISmantic-plugin ./core-plugins/openbismantic
RUN echo 'enabled-modules = dropbox-monitor, dataset-uploader, dataset-file-search, xls-import, openbis-sync, eln-lims, openbis-ng-ui, search-store, openbismantic' > ./core-plugins/core-plugins.properties
#add code to set admin password
RUN sed -i '2s/^/#set admin password\necho "setting admin password"\n\/home\/openbis\/openbis\/servers\/openBIS-server\/jetty\/bin\/passwd.sh change -p ${ADMIN_PASS} admin\n /' /usr/local/bin/docker-entrypoint.sh
RUN sed -i '2s/^/#set etlserver password\necho "setting etlserver password"\n\/home\/openbis\/openbis\/servers\/openBIS-server\/jetty\/bin\/passwd.sh change -p b9QE4aL5V1 etlserver\n /' /usr/local/bin/docker-entrypoint.sh
ADD ./OpenBIS-Ontology /home/openbis/OpenBIS-Ontology
RUN curl -O https://repo.anaconda.com/miniconda/Miniconda3-py310_23.3.1-0-Linux-x86_64.sh && \
    bash Miniconda3-py310_23.3.1-0-Linux-x86_64.sh -bfp /usr/local && \
    rm Miniconda3-py310_23.3.1-0-Linux-x86_64.sh
RUN pip install /home/openbis/OpenBIS-Ontology
