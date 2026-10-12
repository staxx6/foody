import { Route } from '@angular/router';
import { HomeComponent } from './home/home.component';

// One component shows all pages; which one, the UiStore reads from the address
export const appRoutes: Route[] = [{ path: '**', component: HomeComponent }];
