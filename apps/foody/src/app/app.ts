import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PhotoFallback } from './shared/photo-fallback';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  template: `<router-outlet />`,
})
export class App {
  constructor() {
    // Watches all images of the app
    inject(PhotoFallback);
  }
}
