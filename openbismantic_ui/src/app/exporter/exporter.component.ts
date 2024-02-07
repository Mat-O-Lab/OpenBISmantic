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
import {NgOptimizedImage} from "@angular/common";
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";

// adapted from https://material.angular.io/components/tree/examples

enum SelectionState {
  NONE = 0,
  INDETERMINATE = 1,
  SELECTED = 2
}

export class DynamicFlatNode {
  constructor(
    public item: string,
    public iri: URL | null,
    public level = 1,
    public expandable = false,
    public isLoading = false,
    public selected: SelectionState = SelectionState.NONE,
  ) { }
  childNodes: DynamicFlatNode[]|undefined = undefined;
}

export class OpenBISDataSource implements DataSource<DynamicFlatNode> {
  dataChange = new BehaviorSubject<DynamicFlatNode[]>([]);
  selectedHiddenNodes = new Map<string, SelectionState>();

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
        const isChildSelected = (item: {iri?: URL}) => {
          let childSelected = node.selected;
          if (childSelected == SelectionState.INDETERMINATE) {
            if (item.iri) {
              const newChildSelected = this.selectedHiddenNodes.get(item.iri.href);
              childSelected = newChildSelected !== undefined ? newChildSelected : SelectionState.NONE;
              this.selectedHiddenNodes.delete(item.iri.href);
            } else {
              childSelected = SelectionState.NONE;
            }
          }
          return childSelected;
        }
        const nodes = res.map(item => new DynamicFlatNode(item.name, item.iri, node.level + 1, item.expandable, false, isChildSelected(item)));
        nodes.sort((a, b) => {
          if (a.level == 1 && b.level == 1) {
            const isAInventorySpace = this.openbismanticClient.isInventorySpace(a);
            const isBInventorySpace = this.openbismanticClient.isInventorySpace(b);
            if (isAInventorySpace != isBInventorySpace) {
              return Number(isAInventorySpace) - Number(isBInventorySpace);
            }
          }
          return a.item.localeCompare(b.item);
        });
        node.childNodes = nodes;
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
      ) {
        if (node.selected == 1 && this.data[i].selected) {
          const iri = this.data[i].iri;
          if (iri != null)
            this.selectedHiddenNodes.set(iri.href, this.data[i].selected);
        }
      }
      this.data.splice(index + 1, count);
      this.dataChange.next(this.data);
    }
  }

  getChildNodes(node: DynamicFlatNode) {
    const index = this.data.indexOf(node);
    let count = 0;
    for (
      let i = index + 1;
      i < this.data.length && this.data[i].level > node.level;
      ++i, ++count
    ) {}
    return this.data.slice(index + 1, index + 1 + count);
  }

  getParentNode(node: DynamicFlatNode) {
    const index = this.data.indexOf(node);
    for (let i = index - 1; i >= 0; --i) {
      if (this.data[i].level < node.level)
        return this.data[i];
    }
    return null;
  }

  getSiblingNodes(node: DynamicFlatNode) {
    const index = this.data.indexOf(node);
    const siblingNodes = [];
    for (let i = index; i >=0 && this.data[i].level >= node.level; --i) {
      if (this.data[i].level === node.level)
        siblingNodes.push(this.data[i]);
    }
    for (let i = index + 1; i < this.data.length && this.data[i].level >= node.level; ++i) {
      if (this.data[i].level === node.level)
        siblingNodes.push(this.data[i]);
    }
    return siblingNodes;
  }


  *getChecked(rootNode: DynamicFlatNode = this.data[0]): Generator<DynamicFlatNode> {
    if (rootNode.selected === SelectionState.SELECTED)
      yield rootNode;
    else if (rootNode.childNodes) {
      for (let childNode of rootNode.childNodes) {
        switch (childNode.selected) {
          case SelectionState.NONE:
            break;
          case SelectionState.SELECTED:
            yield childNode;
            break;
          case SelectionState.INDETERMINATE:
            yield* this.getChecked(childNode);
        }
      }
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
    MatButtonModule,
    NgOptimizedImage
  ],
  templateUrl: './exporter.component.html',
  styleUrl: './exporter.component.scss'
})
export class ExporterComponent {
  constructor(public modalService: NgbModal) {
    this.treeControl = new FlatTreeControl<DynamicFlatNode>(this.getLevel, this.isExpandable);
    this.openbismanticClient = new OpenbismanticClient();
    this.openbismanticClient.init(modalService);
    this.dataSource = new OpenBISDataSource(this.treeControl, this.openbismanticClient);
    this.dataSource.data = [
      new DynamicFlatNode('instance', new URL('/openbismantic/instance/', document.baseURI), 0, true)
    ];
  }
  openbismanticClient: OpenbismanticClient;
  treeControl: FlatTreeControl<DynamicFlatNode>;
  dataSource: OpenBISDataSource;
  getLevel = (node: DynamicFlatNode) => node.level;
  isExpandable = (node: DynamicFlatNode) => node.expandable;
  hasChild = (_: number, _nodeData: DynamicFlatNode) => _nodeData.expandable;
  isInventorySpace = (node: DynamicFlatNode) => this.openbismanticClient.isInventorySpace(node);

  toggleChecked = (node: DynamicFlatNode) => {
    const checkbox = document.querySelector(`input[data-iri="${node.iri}"]`) as HTMLInputElement;
    if (checkbox.checked) {
      node.selected = SelectionState.SELECTED;
    } else {
      node.selected = SelectionState.NONE;
    }
    for (let childNode of this.dataSource.getChildNodes(node)) {
      childNode.selected = node.selected;
    }

    let parentNode: DynamicFlatNode|null = node;
    while (parentNode) {
      const siblingNodes = this.dataSource.getSiblingNodes(parentNode);
      const siblingSelections = siblingNodes.map(siblingNode => siblingNode.selected);
      const parentSelected = siblingSelections.every(status => status === SelectionState.SELECTED);
      const parentIndeterminate = !parentSelected && siblingSelections.some(Boolean);
      parentNode = this.dataSource.getParentNode(parentNode);
      if (parentNode == null)
        break;
      if (parentSelected)
        parentNode.selected = SelectionState.SELECTED;
      else if (parentIndeterminate)
        parentNode.selected = SelectionState.INDETERMINATE;
      else
        parentNode.selected = SelectionState.NONE;
    }
  }

  loadSelected = async () => {
    this.openbismanticClient.resetStore();
    for (let selectedNode of this.dataSource.getChecked()) {
      if (selectedNode.iri) {
        await this.openbismanticClient.load(selectedNode.iri);
      }
    }
  }

  exportStore = (format = 'application/x-turtle', extension = 'ttl') => {
    const data = this.openbismanticClient.export(format);
    if (!data)
      return;
    const a = document.createElement('a');
    a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data));
    a.setAttribute('download', `openbismantic.${extension}`);
    a.click();
  }

  graphicQuery = () => {
    const outputElement = document.getElementById('query-output') as HTMLPreElement;
    const queryString = (document.getElementById('query-input') as HTMLTextAreaElement).value;
    const query = SPARQLToQuery(queryString, true, this.openbismanticClient.internalStore);
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
