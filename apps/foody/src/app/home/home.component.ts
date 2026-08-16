import { Component } from '@angular/core';
import { DishEntryListComponent } from '../dish-entry/dish-entry-list.component';
import { SymptomEntryListComponent } from '../symptom-entry/symptom-entry-list.component';

@Component({
  imports: [DishEntryListComponent, SymptomEntryListComponent],
  template: `
    <h1>foody</h1>
    <h2>Day</h2>
    <app-dish-entry-list />
    <h2>Health</h2>
    <app-symptom-entry-list />
  `,
})
export class HomeComponent {}
