import {graph, SPARQLToQuery, Store, parse, serialize} from "rdflib";
import {DynamicFlatNode} from "./app/exporter/exporter.component";

export class OpenbismanticClient {
  constructor() {
    this.store = graph();
    this.getELNSettings().then(settings => {this.elnSettings = settings});
  }

  store: Store;
  resolvedIris = new Set();
  elnSettings: {inventorySpaces: string[]}|null = null;

  async fetchUrl(url: URL) {
    if (this.resolvedIris.has(url)) {
      return;
    } else {
      let res = await fetch(url, {headers: {'Accept': 'application/x-turtle'}});
      let body = await res.text();
      const contentType = /*res.headers.get('content-type') ||*/ 'text/turtle';
      try {
        parse(body, this.store, 'https://openbis.matolab.org/', contentType);
        this.resolvedIris.add(url)
      } catch (e) {
        console.error(e);
      }
    }
  }

  capitalize(s: string) {
    return s[0].toUpperCase() + s.slice(1);
  }

  openBISHierarchy = ['instance', 'space', 'project', 'collection', 'object'];

  childQueryBuilder(parentIRI: URL) {
    const parentType = parentIRI.pathname.split('/')[2];
    const parentLevel = this.openBISHierarchy.indexOf(parentType);
    let childType;
    if (parentLevel >= 0 && parentLevel < (this.openBISHierarchy.length - 1)) {
      childType = this.openBISHierarchy[parentLevel + 1];
    } else {
      throw `invalid parent type: ${parentType}`;
    }
    const terms = [];
    terms.push(`?iri <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://purl.matolab.org/openbis/${this.capitalize(childType)}>; <https://purl.matolab.org/openbis/code> ?code.`);
    if (parentType !== 'instance')
      terms.push(`<${parentIRI.toString()}> <https://purl.matolab.org/openbis/relates_to> ?iri.`)
    return `SELECT ?iri ?code WHERE {${terms.join(' ')}}.`
  }

  async getChildren(iri: URL) {
    await this.fetchUrl(iri);
    const queryString = this.childQueryBuilder(iri);
    console.log(this.store, SPARQLToQuery);
    console.log(queryString);
    const query = SPARQLToQuery(queryString, true, this.store);
    if (query === false)
      return [];
    return this.store.querySync(query).map(res => ({
      name: res['?code'].value,
      iri: new URL(res['?iri'].value),
      expandable: this.openBISHierarchy.indexOf((new URL(res['?iri'].value)).pathname.split('/')[2]) < (this.openBISHierarchy.length - 1),
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getELNSettings() {
    await this.fetchUrl(new URL('/openbismantic/eln_settings', document.baseURI));
    const queryString = 'SELECT ?settings ?iri WHERE {' +
      '?iri <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://xeo54:8128/openbismantic/class/GENERAL_ELN_SETTINGS>. ' +
      '?iri <https://xeo54:8128/openbismantic/object_property/ELN_SETTINGS> ?settings.' +
      '}';
    const query = SPARQLToQuery(queryString, true, this.store);
    if (query === false)
      throw 'failed to create settings query';
    const settings = JSON.parse(this.store.querySync(query)[0]['?settings']);
    console.log(settings);
    return settings;
  }

  isInventorySpace = (node: DynamicFlatNode) => {
    if (node.level != 1)
      return false;
    if (!this.elnSettings)
      return false;
    const inventorySpaces = this.elnSettings.inventorySpaces;
    return inventorySpaces.includes(node.item);
  };

  exportInternalStore(format: string) {
    return serialize(null, this.store, undefined, format);
  }
}
