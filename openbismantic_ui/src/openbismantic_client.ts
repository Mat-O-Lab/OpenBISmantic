import {graph, SPARQLToQuery, Store, parse, serialize} from "rdflib";
import {DynamicFlatNode, ExporterComponent} from "./app/exporter/exporter.component";
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {LoginComponent} from "./app/login/login.component"

class AuthError extends Error { }

class OpenbismanticStore extends Store {
  constructor() {
    super();
  }

  resolvedIris = new Set();

  async fetchUrl(url: URL) {
    if (this.resolvedIris.has(url)) {
      return;
    } else {
      let res = await fetch(url, {headers: {'Accept': 'application/x-turtle'}});
      if (res.status === 401) {
        throw new AuthError();
      }
      let body = await res.text();
      const contentType = /*res.headers.get('content-type') ||*/ 'text/turtle';
      try {
        parse(body, this, 'https://openbis.matolab.org/', contentType);
        this.resolvedIris.add(url)
      } catch (e) {
        console.error(`failed to load ${url}`);
        console.error(e);
        console.error(contentType, body);
      }
    }
  }
}

export class OpenbismanticClient {
  constructor() {
    this.internalStore = new OpenbismanticStore();
    this.store = new OpenbismanticStore();
  }

  internalStore: OpenbismanticStore;
  store: OpenbismanticStore;
  elnSettings: {inventorySpaces: string[]}|null = null;

  capitalize(s: string) {
    return s[0].toUpperCase() + s.slice(1);
  }

  init(modalService: NgbModal) {
    this.getELNSettings().then(settings => {this.elnSettings = settings}).catch(e => {
      if (e instanceof AuthError) {
        const openModal = modalService.open(LoginComponent, {backdrop: 'static', keyboard: false});
        openModal.componentInstance.await().then(() => {
          openModal.close();
          this.init(modalService);
        });
      } else {
        console.error(e);
      }
    });
  }

  openBISHierarchy = ['instance', 'space', 'project', 'collection', 'object'];

  childQueryBuilder(parentIRI: URL) {
    const parentType = parentIRI.pathname.split('/')[2];
    const parentLevel = this.openBISHierarchy.indexOf(parentType);
    let childType;
    if (parentLevel >= 0 && parentLevel < (this.openBISHierarchy.length - 1)) {
      childType = this.openBISHierarchy[parentLevel + 1];
    } else {
      return null;
    }
    const terms = [];
    terms.push(`?iri <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://purl.matolab.org/openbis/${this.capitalize(childType)}>; <https://purl.matolab.org/openbis/code> ?code.`);
    if (parentType !== 'instance')
      terms.push(`<${parentIRI.toString()}> <https://purl.matolab.org/openbis/relates_to> ?iri.`)
    return `SELECT ?iri ?code WHERE {${terms.join(' ')}}.`
  }

  async getChildren(iri: URL, store: boolean = false) {
    await (store ? this.store : this.internalStore).fetchUrl(iri);
    const queryString = this.childQueryBuilder(iri);
    if (!queryString)
      return [];
    const query = SPARQLToQuery(queryString, true, this.internalStore);
    if (query === false)
      return [];
    return (store ? this.store : this.internalStore).querySync(query).map(res => ({
      name: res['?code'].value,
      iri: new URL(res['?iri'].value),
      expandable: this.openBISHierarchy.indexOf((new URL(res['?iri'].value)).pathname.split('/')[2]) < (this.openBISHierarchy.length - 1),
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getELNSettings() {
    await this.internalStore.fetchUrl(new URL('/openbismantic/eln_settings', document.baseURI));
    const queryString = 'SELECT ?settings ?iri WHERE {' +
        `?iri <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <${document.baseURI}/openbismantic/class/GENERAL_ELN_SETTINGS>. ` +
        `?iri <${document.baseURI}/openbismantic/object_property/ELN_SETTINGS> ?b01. ` +
        '?b01 <http://www.w3.org/ns/oa#hasLiteralBody> ?settings.' +
        '}';
    console.log(queryString);
    const query = SPARQLToQuery(queryString, true, this.internalStore);
    if (query === false)
      throw 'failed to create settings query';
    const settings = JSON.parse(this.internalStore.querySync(query)[0]['?settings']);
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
    return serialize(null, this.internalStore, undefined, format);
  }

  resetStore() {
    this.store = new OpenbismanticStore();
  }

  export(format: string) {
    return serialize(null, this.store, undefined, format);
  }

  async load(...iris: URL[]) {
    for (let iri of iris) {
      const children = await this.getChildren(iri, true);
      for (let child of children) {
        const childIri = new URL(child.iri);
        if (!iris.includes(childIri)) {
          iris.push(childIri);
        }
      }
    }
  }
}
