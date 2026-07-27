import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import PocketBase from 'pocketbase';
import { IngredientStore } from './ingredient/ingredient-store';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  template: ` <h1>Foody</h1>

    @for (ingredient of ingredientStore.ingredients(); track ingredient.id) {
      <p>{{ ingredient.name }}</p>
    }`,
  styleUrl: './app.scss',
})
export class App {
  pb = new PocketBase('http://127.0.0.1:8090');

  readonly ingredientStore = inject(IngredientStore);

  constructor() {
    this.load();
  }

  async load() {
    await this.pb
      .collection('users')
      .authWithPassword('staxx@hotmail.de', '2}XERs93~cXiHvW'); // Just a local test user
    const res = await this.pb
      .collection('TestCollection')
      .getOne('m48y8p4nayiuezc');

    console.log(res);
  }
}
