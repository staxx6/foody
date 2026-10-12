import { Route } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { confirmLeaving } from './shared/confirm/confirm-leaving';

// One component shows all pages; which one, the UiStore reads from the address
export const appRoutes: Route[] = [
  {
    path: '**',
    component: HomeComponent,
    // The route stays the same for every page, so it is asked every time
    canActivate: [confirmLeaving],
    runGuardsAndResolvers: 'always',
  },
];
