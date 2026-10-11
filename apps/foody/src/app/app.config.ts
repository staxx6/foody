import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  DATA_ACCESS,
  DATA_ACCESS_CONFIG,
  OfflineDataAccessService,
} from '@foody/pocketbase-access';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { SettingsStore } from './shared/settings-store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    {
      provide: DATA_ACCESS_CONFIG,
      useValue: {
        // The built app is served together with the PocketBase API (see
        // tools/serve-https.mjs); the dev server runs next to PocketBase
        url: isDevMode()
          ? `${location.protocol}//${location.hostname}:8090`
          : location.origin,
        collections: [
          'amountUnitET',
          'foodItems',
          'ingredients',
          'dishes',
          'dishEntries',
          'symptomTypeET',
          'symptomLocationET',
          'symptoms',
          'symptomEntries',
        ],
      },
    },
    // Work on a local copy that is synchronized with PocketBase
    { provide: DATA_ACCESS, useExisting: OfflineDataAccessService },
    provideAppInitializer(() =>
      inject(OfflineDataAccessService).startAutoSync(),
    ),
    // Applies theme and accent before the first page is shown
    provideAppInitializer(() => void inject(SettingsStore)),
  ],
};
