import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

// Makes the built app start without the server, see public/sw.js
if (!isDevMode() && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err) => console.error(err));
}
