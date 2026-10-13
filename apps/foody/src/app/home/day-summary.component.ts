import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import {
  DATA_ACCESS,
  OfflineDataAccessService,
} from '@foody/pocketbase-access';
import { DishEntryStore } from '../dish-entry/dish-entry-store';
import { MedicationEntryStore } from '../medication/medication-entry-store';
import {
  addDays,
  fromPocketBaseDate,
  isSameDay,
  startOfDay,
} from '../shared/date-utils';
import { I18n } from '../shared/i18n/i18n';
import { IconComponent } from '../shared/icon.component';
import { LevelChipComponent } from '../shared/level.component';
import { UiStore } from '../shared/ui-store';
import { CourseLineComponent } from '../symptom-entry/course-line.component';
import { SymptomEntryStore } from '../symptom-entry/symptom-entry-store';

/** What was eaten this long before a symptom is shown with it */
const HOURS_BEFORE = 6;

type Eaten = { time: number; name: string };

/**
 * The day at a glance, next to its timeline: how much was logged, and for
 * every symptom what was eaten in the hours before it. Only on screens wide
 * enough for a column of its own.
 */
@Component({
  selector: 'app-day-summary',
  imports: [DatePipe, IconComponent, LevelChipComponent, CourseLineComponent],
  template: `
    <section>
      <h2><app-icon name="report" /> {{ t().daySummary }}</h2>
      <div class="card figures">
        <div class="figure">
          <app-icon name="meal" />
          <span class="number">{{ mealCount() }}</span>
          <span class="label">{{ t().meals }}</span>
        </div>
        <div class="figure">
          <app-icon name="symptom" />
          <span class="number">{{ symptoms().length }}</span>
          <span class="label">{{ t().symptoms }}</span>
        </div>
        <div class="figure">
          <app-icon name="pill" />
          <span class="number">{{ medicationCount() }}</span>
          <span class="label">{{ t().medications }}</span>
        </div>
      </div>
    </section>

    <section>
      <h2><app-icon name="symptom" /> {{ t().symptomsAndBefore }}</h2>
      <div class="card">
        @for (symptom of symptoms(); track symptom.entry.id) {
          <button
            type="button"
            class="symptom"
            [title]="t().showInList"
            (click)="uiStore.focusRowId.set(symptom.entry.id)"
          >
            <span class="line">
              <span class="time">{{ symptom.entry.date | date: 'HH:mm' }}</span>
              <span class="name">{{ symptom.entry.symptomName }}</span>
              @if (symptom.entry.discomfortLevel; as level) {
                <app-level-chip [level]="level" />
              }
              <app-course-line [entry]="symptom.entry" />
            </span>
            <span class="before">
              @if (symptom.eaten.length > 0) {
                <span class="label">{{
                  t().eatenBeforeSymptom(hoursBefore)
                }}</span>
                {{ symptom.eaten.join(', ') }}
              } @else {
                {{ t().nothingEatenBefore(hoursBefore) }}
              }
            </span>
          </button>
        } @empty {
          <p class="list-message">{{ t().noSymptoms }}</p>
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 28px;
      }

      h2 {
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

      .figures {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        padding: 14px 8px;
      }

      .figure {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        color: var(--text-muted);
      }

      .figure + .figure {
        border-left: 1px solid var(--border);
      }

      .number {
        font-size: 1.6rem;
        font-weight: 700;
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
        color: var(--text);
      }

      .label {
        font-size: 0.75rem;
        font-weight: 600;
      }

      .symptom {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
        padding: 12px 14px;
        border: none;
        background: none;
        color: var(--text);
        font: inherit;
        text-align: left;
        cursor: pointer;
      }

      .symptom + .symptom {
        border-top: 1px solid var(--border);
      }

      .symptom:hover {
        background: var(--field);
      }

      .line {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 8px;
      }

      .time {
        font-size: 0.8rem;
        font-variant-numeric: tabular-nums;
        color: var(--text-muted);
      }

      .name {
        font-weight: 600;
      }

      .before {
        font-size: 0.85rem;
        line-height: 1.4;
        color: var(--text-muted);
      }

      .before .label {
        display: block;
      }
    `,
  ],
})
export class DaySummaryComponent {
  protected readonly t = inject(I18n).t;
  protected readonly uiStore = inject(UiStore);
  private readonly dataAccess = inject(DATA_ACCESS);
  private readonly sync = inject(OfflineDataAccessService);
  private readonly mealEntries = inject(DishEntryStore).entries;
  private readonly symptomEntries = inject(SymptomEntryStore).entries;
  private readonly medicationEntries = inject(MedicationEntryStore).entries;

  protected readonly hoursBefore = HOURS_BEFORE;

  /** What was eaten on the day and the evening before, in the order of time */
  private readonly eaten = signal<Eaten[]>([]);

  /** What was eaten at the same time counts as one meal */
  protected readonly mealCount = computed(
    () => new Set(this.mealEntries().map((entry) => entry.date)).size,
  );
  protected readonly medicationCount = computed(
    () => this.medicationEntries().length,
  );

  protected readonly symptoms = computed(() => {
    const eaten = this.eaten();
    return this.symptomEntries().map((entry) => {
      const time = fromPocketBaseDate(entry.date).getTime();
      const names = eaten
        .filter(
          (meal) =>
            meal.time <= time && meal.time > time - HOURS_BEFORE * 3_600_000,
        )
        .map((meal) => meal.name);
      return { entry, eaten: [...new Set(names)] };
    });
  });

  constructor() {
    // Loads initially, for another day and when the data changed
    effect(() => {
      const day = this.uiStore.selectedDay();
      this.sync.revision();
      untracked(() => void this.load(day));
    });
  }

  private async load(day: Date): Promise<void> {
    const start = startOfDay(day);
    const eaten = await this.dataAccess.list<Eaten>({
      collectionName: 'dishEntries',
      options: {
        // A symptom in the morning may come from the evening before
        dateRange: {
          field: 'date',
          from: addDays(start, -1),
          to: addDays(start, 1),
        },
        expand: 'to_foodItem,to_dish',
        sort: 'date',
      },
      map: (record) => {
        const expand = record['expand'] as
          | Record<string, Record<string, unknown>>
          | undefined;
        const source = expand?.['to_foodItem'] ?? expand?.['to_dish'];
        return {
          time: fromPocketBaseDate(
            String(record['date'] ?? record.created),
          ).getTime(),
          name: String(source?.['name'] ?? '–'),
        };
      },
    });
    // Another day may have been chosen in the meantime
    if (isSameDay(day, this.uiStore.selectedDay())) this.eaten.set(eaten);
  }
}
