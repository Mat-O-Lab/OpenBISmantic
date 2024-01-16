import { Routes } from '@angular/router';
import {HomeComponent} from "./home/home.component";
import {ExporterComponent} from "./exporter/exporter.component";

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'exporter',
    component: ExporterComponent
  }
];
