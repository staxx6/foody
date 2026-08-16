import { Component } from '@angular/core';
import { DishEntryListComponent } from '../dish-entry/dish-entry-list.component';

@Component({
  imports: [DishEntryListComponent],
  template: `
    <h1>foody</h1>
    <h2>Day</h2>
    <app-dish-entry-list />
    <h2>Health</h2>
  `,
})
export class HomeComponent {}
