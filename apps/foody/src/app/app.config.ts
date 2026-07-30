import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { DATA_ACCESS_CONFIG } from '@foody/pocketbase-access';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    {
      provide: DATA_ACCESS_CONFIG,
      useValue: {
        url: 'http://127.0.0.1',
        port: 8090,
      },
    },
  ],
};
