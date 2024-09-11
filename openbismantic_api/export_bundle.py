import io
import sys
import zipfile
import os
from urllib.parse import urlsplit

import rdflib
import pybis
import requests

RDF_SYNTAX = rdflib.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
SCHEMA = rdflib.Namespace('http://schema.org/')
DCAT = rdflib.Namespace('http://www.w3.org/ns/dcat#')
PROV = rdflib.Namespace('http://www.w3.org/ns/prov#')



def export_from_graph(bis: pybis.Openbis, graph: rdflib.Graph):
    distribution_query = """
    SELECT ?dist ?dataset ?perm_id ?dl_url WHERE {
        ?dist a <http://www.w3.org/ns/dcat#Distribution>.
        ?dataset <http://www.w3.org/ns/dcat#distribution> ?dist;
                 <http://w3id.org/matolab/openbis/code> ?perm_id;
                 <http://w3id.org/matolab/openbis/relates_to> ?datastore.
        ?datastore a <http://w3id.org/matolab/openbis/DataStore>;
                   <http://www.w3.org/ns/dcat#downloadURL> ?dl_url.
    }
    """

    zb = io.BytesIO()
    with zipfile.ZipFile(zb, 'a', zipfile.ZIP_DEFLATED, False) as zf:
        graph.add((rdflib.URIRef('./'), RDF_SYNTAX.type, SCHEMA.Dataset))
        for query_result in graph.query(distribution_query):
            dist, dataset, perm_id, dl_url = query_result
            dist_path = str(dist)[str(dist).find(perm_id.value):]
            file_node = rdflib.URIRef(dist_path)
            graph.add((file_node, RDF_SYNTAX.type, SCHEMA.File))
            graph.add((file_node, PROV.wasDerivedFrom, dist))
            dl_url = f'{dl_url.value}/datastore_server/{dist_path}'
            base_url = os.environ.get('BASE_URL', None)
            verify = not bool(os.environ.get('NO_VERIFY_CERTIFICATES', False))
            if base_url and urlsplit(base_url).hostname == urlsplit(dl_url).hostname:
                dl_res = requests.get(dl_url, params={'sessionID': bis.token}, verify=verify)
                if dl_res.status_code == 200:
                    zf.writestr(dist_path, dl_res.content)
                else:
                    print(f'failed to download file {dl_url}: {dl_res.status_code}', sys.stderr)
            else:
                print(f'not allowed to download {dl_url}', sys.stderr)

        gb = io.BytesIO()
        graph.serialize(gb, 'json-ld')
        zf.writestr('ro-crate-metadata.json', gb.getvalue())
    zb.seek(0)
    return zb
