import io
import sys
import zipfile

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
            dist_path_parts = dist_path.split('/')
            for depth in range(len(dist_path_parts) - 1):
                new_node = rdflib.URIRef(dist_path_parts[depth])
                parent_node =  rdflib.URIRef(dist_path_parts[depth - 1] if depth > 0 else './')
                graph.add((new_node, RDF_SYNTAX.type, SCHEMA.Dataset))
                graph.add((parent_node, SCHEMA.hasPart, new_node))
                if depth == 0:
                    graph.add((new_node, PROV.wasDerivedFrom, dataset))
            file_node = rdflib.URIRef(dist_path_parts[-1])
            graph.add((file_node, RDF_SYNTAX.type, SCHEMA.File))
            dl_url = f'{dl_url.value}/datastore_server/{dist_path}'
            # todo: verify that dl_url is this instance, read verify from env vars
            dl_res = requests.get(dl_url, params={'sessionID': bis.token}, verify=False)
            if dl_res.status_code == 200:
                zf.writestr(dist_path, dl_res.content)
            else:
                print(f'failed to download file {dl_url}: {dl_res.status_code}', sys.stderr)

        gb = io.BytesIO()
        graph.serialize(gb, 'json-ld')
        zf.writestr('ro-crate-metadata.json', gb.getvalue())
    zb.seek(0)
    return zb
