import { Component, computed, inject, OnInit } from '@angular/core';
import { DishStore } from '../dish/dish-store';
import { IngredientStore } from '../ingredient/ingredient-store';
import { AmountUnitStore } from '../shared/amount-unit-store';
import { ConfirmService } from '../shared/confirm/confirm.service';
import { I18n } from '../shared/i18n/i18n';
import { IconComponent, IconName } from '../shared/icon.component';
import { SymptomStore } from '../symptom-entry/symptom-store';

type ListItem = { id: string; name: string };
type List = {
  title: string;
  icon: IconName;
  items: ListItem[];
  remove: (id: string) => Promise<void>;
};

/**
 * Shows what can be picked when logging and lets the user delete it
 */
@Component({
  selector: 'app-manage-lists',
  imports: [IconComponent],
  template: `
    <h2 class="page-title">{{ t().manageLists }}</h2>

    @for (list of lists(); track list.title) {
      <section>
        <h3><app-icon [name]="list.icon" /> {{ list.title }}</h3>
        <div class="card">
          @if (list.items.length > 0) {
            <ul class="entry-list">
              @for (item of list.items; track item.id) {
                <li class="entry">
                  <span class="name">{{ item.name }}</span>
                  <button
                    type="button"
                    class="icon-btn"
                    (click)="confirm.delete(item, bind(list, item))"
                    [attr.aria-label]="t().deleteNamed(item.name)"
                  >
                    <app-icon name="trash" />
                  </button>
                </li>
              }
            </ul>
          } @else {
            <p class="list-message">{{ t().emptyList }}</p>
          }
        </div>
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .page-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
      }

      h3 {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0 0 8px 4px;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
      }

      .card {
        overflow: hidden;
      }
    `,
  ],
})
export class ManageListsComponent implements OnInit {
  private readonly foodStore = inject(IngredientStore);
  private readonly dishStore = inject(DishStore);
  private readonly symptomStore = inject(SymptomStore);
  private readonly unitStore = inject(AmountUnitStore);
  private readonly i18n = inject(I18n);
  protected readonly confirm = inject(ConfirmService);
  protected readonly t = this.i18n.t;

  protected readonly lists = computed<List[]>(() => [
    {
      title: this.t().foods,
      icon: 'food',
      items: this.foodStore.foodItems(),
      remove: (id) => this.foodStore.deleteFoodItem(id),
    },
    {
      title: this.t().dishes,
      icon: 'dish',
      items: this.dishStore.dishes(),
      remove: (id) => this.dishStore.deleteDish(id),
    },
    {
      title: this.t().symptoms,
      icon: 'symptom',
      items: this.symptomStore.symptoms(),
      remove: (id) => this.symptomStore.deleteSymptom(id),
    },
    {
      title: this.t().units,
      icon: 'tag',
      items: this.unitStore
        .units()
        .map((unit) => ({ id: unit.id, name: this.i18n.name(unit) })),
      remove: (id) => this.unitStore.deleteUnit(id),
    },
  ]);

  ngOnInit(): void {
    this.foodStore.loadFoodItems();
    this.dishStore.loadDishes();
    this.symptomStore.loadSymptoms();
    this.unitStore.loadUnits();
  }

  protected bind(list: List, item: ListItem): () => Promise<void> {
    return () => list.remove(item.id);
  }
}
