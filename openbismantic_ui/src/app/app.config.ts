import {APP_INITIALIZER, ApplicationConfig, importProvidersFrom} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import {ConfigService} from "../config.service";
import {HttpClientModule} from "@angular/common/http";


export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    importProvidersFrom(HttpClientModule),
    {
      provide: APP_INITIALIZER,
      useFactory: (configService: ConfigService) => configService.loadConfig.bind(configService),
      deps: [ConfigService],
      multi: true
    }
  ]
};
