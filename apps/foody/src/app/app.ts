import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NxWelcome } from './nx-welcome';
import PocketBase from 'pocketbase';

@Component({
  imports: [NxWelcome, RouterModule],
  selector: 'app-root',
  template: `
    <h1>Hello World</h1>
`,
  styleUrl: './app.scss',
})
export class App {
  pb = new PocketBase('http://127.0.0.1:8090');

  constructor() {
    this.load();
  }

  async load() {
    await this.pb.collection('users').authWithPassword('staxx@hotmail.de', '2}XERs93~cXiHvW'); // Just a local test user
    const res = await this.pb.collection('TestCollection').getOne('np0fte0uq7pvs8m');
    console.log(res);
  }
}
