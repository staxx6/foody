import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import {
  DATA_ACCESS,
  DataRecord,
  OfflineDataAccessService,
} from '@foody/pocketbase-access';
import { fromPocketBaseDate } from '../shared/date-utils';
import { I18n, toLocalizedName } from '../shared/i18n/i18n';
import { IconComponent, IconName } from '../shared/icon.component';
import { Keyboard } from '../shared/keyboard/keyboard';
import { PhotoViewerComponent } from '../shared/photo-viewer.component';
import { ActiveSite, UiStore } from '../shared/ui-store';

export type ItemKind = 'food' | 'dish' | 'symptom' | 'medication';

/** Where each kind is stored, logged and edited */
const KINDS: Record<
  ItemKind,
  {
    collection: string;
    expand?: string;
    entryCollection: string;
    entryField: string;
    editForm: ActiveSite;
    icon: IconName;
  }
> = {
  food: {
    collection: 'foodItems',
    expand: 'to_defaultUnit',
    entryCollection: 'dishEntries',
    entryField: 'to_foodItem',
    editForm: 'new-food-item',
    icon: 'food',
  },
  dish: {
    collection: 'dishes',
    expand: 'to_ingredients.to_foodItem,to_ingredients.to_amountUnit',
    entryCollection: 'dishEntries',
    entryField: 'to_dish',
    editForm: 'new-dish',
    icon: 'dish',
  },
  symptom: {
    collection: 'symptoms',
    expand: 'to_type,to_locations',
    entryCollection: 'symptomEntries',
    entryField: 'to_symptom',
    editForm: 'new-symptom',
    icon: 'symptom',
  },
  medication: {
    collection: 'medications',
    expand: 'to_defaultUnit',
    entryCollection: 'medicationEntries',
    entryField: 'to_medication',
    editForm: 'new-medication',
    icon: 'pill',
  },
};

const HISTORY_LENGTH = 5;

type Details = {
  name: string;
  text: string;
  images: string[];
  /** Label and value, e.g. the strength of a medication */
  facts: { label: string; value: string }[];
  ingredients: { name: string; amount: string }[];
  timesLogged: number;
  /** The most recent entries, newest first */
  history: Date[];
};

/**
 * Shows a food, dish, symptom or medication: what was entered for it and
 * when it was logged
 */
@Component({
  selector: 'app-item-details',
  imports: [DatePipe, IconComponent, PhotoViewerComponent],
  template: `
    <div class="form-header">
      <button
        type="button"
        class="back-btn"
        (click)="uiStore.close()"
        [attr.aria-label]="t().back"
      >
        <app-icon name="back" />
      </button>
      <h2>
        <app-icon [name]="config().icon" />
        {{ details()?.name }}
      </h2>
      <button
        type="button"
        class="back-btn"
        (click)="uiStore.edit(config().editForm, id())"
        [attr.aria-label]="t().edit"
        [title]="t().edit"
      >
        <app-icon name="edit" />
      </button>
    </div>

    @if (details(); as item) {
      @if (item.images.length > 0) {
        <div class="photos">
          @for (url of item.images; track url; let index = $index) {
            <button
              type="button"
              (click)="viewer.open(index)"
              [attr.aria-label]="t().enlargePhoto"
            >
              <img [src]="url" alt="" />
            </button>
          }
        </div>
        <app-photo-viewer #viewer [photos]="item.images" />
      }

      @if (item.text || item.facts.length > 0) {
        <section class="card">
          @if (item.facts.length > 0) {
            <dl>
              @for (fact of item.facts; track fact.label) {
                <div>
                  <dt>{{ fact.label }}</dt>
                  <dd>{{ fact.value }}</dd>
                </div>
              }
            </dl>
          }
          @if (item.text) {
            <p class="text">{{ item.text }}</p>
          }
        </section>
      }

      @if (item.ingredients.length > 0) {
        <section>
          <h3>{{ t().ingredients }}</h3>
          <ul class="card entry-list">
            @for (ingredient of item.ingredients; track $index) {
              <li class="entry">
                <span class="name">{{ ingredient.name }}</span>
                @if (ingredient.amount) {
                  <span class="chip">{{ ingredient.amount }}</span>
                }
              </li>
            }
          </ul>
        </section>
      }

      <section>
        <h3>{{ t().logged }}</h3>
        <div class="card">
          @if (item.timesLogged > 0) {
            <p class="summary">{{ t().timesLogged(item.timesLogged) }}</p>
            <ul class="entry-list">
              @for (date of item.history; track date.getTime()) {
                <li>
                  <button
                    type="button"
                    class="history"
                    data-row
                    (click)="uiStore.showDay(date)"
                  >
                    <span>{{ i18n.formatFullDate(date) }}</span>
                    <span class="time">{{ date | date: 'HH:mm' }}</span>
                    <app-icon name="chevron-right" />
                  </button>
                </li>
              }
            </ul>
          } @else {
            <p class="list-message">{{ t().neverLogged }}</p>
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
        gap: 16px;
      }

      .form-header {
        margin-bottom: 0;
      }

      .form-header h2 {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .form-header h2 app-icon {
        color: var(--text-muted);
      }

      .photos {
        display: flex;
        gap: 8px;
        overflow-x: auto;
      }

      /* A click shows the photo large */
      .photos button {
        flex: none;
        display: flex;
        padding: 0;
        border: none;
        border-radius: var(--radius-lg);
        background: none;
        cursor: zoom-in;
      }

      .photos img {
        width: 160px;
        height: 160px;
        object-fit: cover;
        border-radius: var(--radius-lg);
      }

      /* A single photo may be larger */
      .photos button:only-child {
        flex: 1;
      }

      .photos button:only-child img {
        width: 100%;
        height: auto;
        max-height: 280px;
      }

      section.card {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 16px;
      }

      .card {
        overflow: hidden;
      }

      dl {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin: 0;
      }

      dl div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 0.95rem;
      }

      dt {
        color: var(--text-muted);
      }

      dd {
        margin: 0;
        font-weight: 600;
        text-align: right;
        overflow-wrap: anywhere;
      }

      .text {
        margin: 0;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      h3 {
        margin: 8px 0 8px 4px;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
      }

      .summary {
        margin: 0;
        padding: 14px 16px 10px;
        font-weight: 600;
      }

      .history {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px 16px;
        border: none;
        border-top: 1px solid var(--border);
        background: none;
        color: var(--text);
        font-size: 0.95rem;
        text-align: left;
        cursor: pointer;
      }

      .history span:first-child {
        flex: 1;
      }

      .history .time,
      .history app-icon {
        color: var(--text-muted);
      }

      /* Wide screens: the item on the left, when it was logged on the right */
      @media (min-width: 1024px) {
        :host {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          align-items: start;
          gap: 20px 32px;
          max-width: 1000px;
        }

        .form-header {
          grid-column: 1 / -1;
        }

        .photos,
        :host > section {
          grid-column: 1;
        }

        :host > section:last-of-type {
          grid-column: 2;
          grid-row: 2 / span 4;
        }

        :host > section:last-of-type h3 {
          margin-top: 0;
        }

        /* Nothing but the log: it takes the place of the item */
        :host > section:only-of-type {
          grid-column: 1;
        }
      }
    `,
  ],
})
export class ItemDetailsComponent {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly uiStore = inject(UiStore);
  private readonly dataAccess = inject(DATA_ACCESS);
  private readonly sync = inject(OfflineDataAccessService);

  readonly kind = input.required<ItemKind>();
  readonly id = input.required<string>();

  protected readonly config = () => KINDS[this.kind()];
  protected readonly details = signal<Details | null>(null);

  constructor() {
    inject(Keyboard).bind({
      e: () => this.uiStore.edit(this.config().editForm, this.id()),
    });

    // Loads initially, in another language and after a synchronization
    effect(() => {
      this.sync.revision();
      this.i18n.language();
      void this.load(this.kind(), this.id());
    });
  }

  private async load(kind: ItemKind, id: string): Promise<void> {
    const config = KINDS[kind];
    const [record, entryDates] = await Promise.all([
      this.dataAccess.getOne({
        collectionName: config.collection,
        id,
        expand: config.expand,
        map: (item) => item,
      }),
      this.dataAccess
        .list({
          collectionName: config.entryCollection,
          options: { sort: '-date' },
          map: (entry) =>
            entry[config.entryField] === id
              ? fromPocketBaseDate(String(entry['date'] ?? entry.created))
              : null,
        })
        .then((dates) => dates.filter((date): date is Date => date !== null)),
    ]);

    // Deleted in the meantime, e.g. on another device
    if (!record) return this.uiStore.close();

    const images = (record['images'] as string[] | undefined) ?? [];
    this.details.set({
      name: String(record['name'] ?? ''),
      text: String(record['description'] ?? record['comment'] ?? ''),
      images: [
        ...images.map((name) => this.dataAccess.getFileUrl(record, name)),
        ...this.locationImages(record),
      ],
      facts: this.facts(kind, record),
      ingredients: this.ingredients(record),
      timesLogged: entryDates.length,
      history: entryDates.slice(0, HISTORY_LENGTH),
    });
  }

  private expanded(record: DataRecord, field: string): DataRecord[] {
    const value = (record['expand'] as Record<string, unknown> | undefined)?.[
      field
    ];
    if (!value) return [];
    return (Array.isArray(value) ? value : [value]) as DataRecord[];
  }

  private facts(
    kind: ItemKind,
    record: DataRecord,
  ): { label: string; value: string }[] {
    const t = this.t();
    const name = (item: DataRecord) => this.i18n.name(toLocalizedName(item));
    const text = (field: string) => String(record[field] ?? '');
    // The amount a food or medication is usually taken in, with its unit
    const usual = [
      text('defaultAmount'),
      ...this.expanded(record, 'to_defaultUnit').map(name),
    ]
      .filter(Boolean)
      .join(' ');

    const facts =
      kind === 'medication'
        ? [
            { label: t.strength, value: text('strength') },
            { label: t.activeIngredient, value: text('activeIngredient') },
            { label: t.usualDose, value: usual },
          ]
        : kind === 'symptom'
          ? [
              {
                label: t.symptomType,
                value: this.expanded(record, 'to_type').map(name).join(', '),
              },
              {
                label: t.symptomLocation,
                value: this.expanded(record, 'to_locations')
                  .map(name)
                  .join(', '),
              },
            ]
          : kind === 'food'
            ? [{ label: t.usualAmount, value: usual }]
            : [];
    return facts.filter((fact) => fact.value);
  }

  private ingredients(record: DataRecord): Details['ingredients'] {
    return this.expanded(record, 'to_ingredients').map((ingredient) => {
      const [food] = this.expanded(ingredient, 'to_foodItem');
      const [unit] = this.expanded(ingredient, 'to_amountUnit');
      return {
        name: String(food?.['name'] ?? '–'),
        amount: [
          ingredient['amount'] ? String(ingredient['amount']) : '',
          unit ? this.i18n.name(toLocalizedName(unit)) : '',
        ]
          .filter(Boolean)
          .join(' '),
      };
    });
  }

  /** A symptom is illustrated by the pictures of its locations */
  private locationImages(record: DataRecord): string[] {
    return this.expanded(record, 'to_locations')
      .filter((location) => location['image'])
      .map((location) =>
        this.dataAccess.getFileUrl(location, String(location['image'])),
      );
  }
}
