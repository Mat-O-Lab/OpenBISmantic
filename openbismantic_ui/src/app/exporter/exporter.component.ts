import { Component } from '@angular/core';
import {MatTreeModule} from "@angular/material/tree";
import {MatIconModule} from "@angular/material/icon";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {FlatTreeControl} from "@angular/cdk/tree";
import {CollectionViewer, DataSource, SelectionChange} from "@angular/cdk/collections";
import {BehaviorSubject, map, merge, Observable} from 'rxjs';
import {OpenbismanticClient} from "../../openbismantic_client";
import {MatButtonModule} from "@angular/material/button";
import {SPARQLToQuery} from "rdflib";

// adapted from https://material.angular.io/components/tree/examples


export class DynamicFlatNode {
  constructor(
    public item: string,
    public iri: URL | null,
    public level = 1,
    public expandable = false,
    public isLoading = false,
  ) {
  }
}

export class OpenBISDataSource implements DataSource<DynamicFlatNode> {
  dataChange = new BehaviorSubject<DynamicFlatNode[]>([]);

  get data(): DynamicFlatNode[] {
    return this.dataChange.value;
  }
  set data(value: DynamicFlatNode[]) {
    this._treeControl.dataNodes = value;
    this.dataChange.next(value);
  }

  constructor(
    private _treeControl: FlatTreeControl<DynamicFlatNode>,
    private openbismanticClient: OpenbismanticClient
  ) {}

  connect(collectionViewer: CollectionViewer): Observable<DynamicFlatNode[]> {
    this._treeControl.expansionModel.changed.subscribe(change => {
      if (
        (change as SelectionChange<DynamicFlatNode>).added ||
        (change as SelectionChange<DynamicFlatNode>).removed
      ) {
        this.handleTreeControl(change as SelectionChange<DynamicFlatNode>);
      }
    });
    return merge(collectionViewer.viewChange, this.dataChange).pipe(map(() => this.data));
  }
  disconnect(collectionViewer: CollectionViewer): void {

  }

  handleTreeControl(change: SelectionChange<DynamicFlatNode>) {
    if (change.added) {
      change.added.forEach(node => this.toggleNode(node, true));
    }
    if (change.removed) {
      change.removed.slice().reverse().forEach(node => this.toggleNode(node, false));
    }
  }

  toggleNode(node: DynamicFlatNode, expand: boolean) {
    const index = this.data.indexOf(node);
    if (expand) {
      node.isLoading = true;
      if (!node.iri)
        return;
      this.openbismanticClient.getChildren(node.iri).then(res => {
        const nodes = res.map(item => new DynamicFlatNode(item.name, item.iri, node.level + 1, item.expandable));
        this.data.splice(index + 1, 0, ...nodes);
        this.dataChange.next(this.data);
        node.isLoading = false;
      })
    } else {
      let count = 0;
      for (
        let i = index + 1;
        i < this.data.length && this.data[i].level > node.level;
        i++, count++
      ) {}
      this.data.splice(index + 1, count);
      this.dataChange.next(this.data);
    }
  }
}

@Component({
  selector: 'app-exporter',
  standalone: true,
  imports: [
    MatTreeModule,
    MatIconModule,
    MatProgressBarModule,
    MatButtonModule
  ],
  templateUrl: './exporter.component.html',
  styleUrl: './exporter.component.scss'
})
export class ExporterComponent {
  constructor() {
    this.treeControl = new FlatTreeControl<DynamicFlatNode>(this.getLevel, this.isExpandable);
    this.openbismanticClient = new OpenbismanticClient();
    this.dataSource = new OpenBISDataSource(this.treeControl, this.openbismanticClient);
    this.dataSource.data = [
      new DynamicFlatNode('instance', new URL('https://xeo54:8128/openbismantic/instance/'), 0, true)
    ];
  }
  openbismanticClient: OpenbismanticClient;
  treeControl: FlatTreeControl<DynamicFlatNode>;
  dataSource: OpenBISDataSource;
  getLevel = (node: DynamicFlatNode) => node.level;
  isExpandable = (node: DynamicFlatNode) => node.expandable;
  hasChild = (_: number, _nodeData: DynamicFlatNode) => _nodeData.expandable;

  exportStore = () => {
    let rdflibFormat = 'application/x-turtle';
    let ext = 'ttl';
    const data = this.openbismanticClient.exportInternalStore(rdflibFormat);
    if (!data)
      return;
    const a = document.createElement('a');
    a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data));
    a.setAttribute('download', `openbismantic.${ext}`);
    a.click();
  }
  graphicQuery = () => {
    const outputElement = document.getElementById('query-output') as HTMLPreElement;
    const queryString = (document.getElementById('query-input') as HTMLTextAreaElement).value;
    const query = SPARQLToQuery(queryString, true, this.openbismanticClient.store);
    if (query === false) {
      outputElement.textContent = 'failed to create query';
    } else {
      const res = this.openbismanticClient.store.querySync(query);
      outputElement.textContent = '';
      for (let item of res) {
        for (let [key, entry] of Object.entries(item)) {
          // @ts-ignore
          outputElement.textContent += `${key}: ${entry.value}\n`;
        }
        outputElement.textContent += '\n';
      }
    }
  }
}
