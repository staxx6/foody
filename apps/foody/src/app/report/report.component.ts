import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { addDays, dayKey, toDateInputValue } from '../shared/date-utils';
import { I18n } from '../shared/i18n/i18n';
import { IconComponent } from '../shared/icon.component';
import { Keyboard } from '../shared/keyboard/keyboard';
import { SearchSelectComponent } from '../shared/search/search-select.component';
import { UiStore } from '../shared/ui-store';
import { SymptomStore } from '../symptom-entry/symptom-store';
import { analyze, Exposure, Finding } from './analysis';
import { daysAgo, ReportData, ReportStore } from './report-store';
import { Cell, createXlsx, Sheet, XLSX_MIME_TYPE } from './xlsx';

/** Presets of the period, in days back from today */
const PERIODS = [30, 90, 365];
/** How long after a meal symptoms are attributed to it */
const TIME_SPANS = [6, 12, 24, 48];

/**
 * Looks for foods that could be bad for the user and exports the data
 */
@Component({
  selector: 'app-report',
  imports: [IconComponent, SearchSelectComponent],
  template: `
    <h2 class="page-title">{{ t().report }}</h2>

    <section class="card settings">
      <div class="setting">
        <span class="label">{{ t().period }}</span>
        <div class="dates">
          <input
            #fromInput
            type="date"
            [value]="from()"
            [max]="to()"
            (change)="from.set(fromInput.value)"
            [attr.aria-label]="t().periodFrom"
          />
          <span>–</span>
          <input
            #toInput
            type="date"
            [value]="to()"
            [min]="from()"
            (change)="to.set(toInput.value)"
            [attr.aria-label]="t().periodTo"
          />
        </div>
        <div class="presets">
          @for (days of periods; track days) {
            <button
              type="button"
              [class.active]="isPeriod(days)"
              (click)="setPeriod(days)"
            >
              {{ t().lastDays(days) }}
            </button>
          }
        </div>
      </div>

      <div class="setting">
        <span class="label">{{ t().symptom }}</span>
        <app-search-select
          [options]="symptomStore.symptoms()"
          [(value)]="symptomId"
          [placeholder]="t().allSymptoms"
          [ariaLabel]="t().filterBySymptom"
        />
      </div>

      <div class="setting">
        <span class="label">{{ t().timeSpan }}</span>
        <div class="segments" role="group" [attr.aria-label]="t().timeSpan">
          @for (span of timeSpans; track span) {
            <button
              type="button"
              [class.active]="hours() === span"
              [attr.aria-pressed]="hours() === span"
              (click)="hours.set(span)"
            >
              {{ t().hours(span) }}
            </button>
          }
        </div>
        <p class="hint">{{ t().timeSpanHint }}</p>
      </div>
    </section>

    <section>
      <h3>{{ t().possibleTriggers }}</h3>
      @if (analysis().meals === 0 || analysis().complaints === 0) {
        <p class="card list-message">{{ t().notEnoughData }}</p>
      } @else {
        <p class="summary">
          {{
            t().reportSummary(
              analysis().meals,
              analysis().complaints,
              percent(analysis().baseline),
              hours()
            )
          }}
        </p>

        @for (finding of conspicuous(); track finding.itemId) {
          <article class="card finding">
            <button
              type="button"
              class="name"
              (click)="showDetails(finding)"
              [title]="t().showDetails"
            >
              <app-icon [name]="finding.kind" /> {{ finding.name }}
            </button>
            <p>
              {{ t().followedBy(finding.followed, finding.eaten) }}
              <strong>{{ percent(finding.rate) }} %</strong>
            </p>
            <div
              class="bar"
              [title]="t().usualShare(percent(analysis().baseline))"
            >
              <span class="fill" [style.width.%]="finding.rate * 100"></span>
              <span
                class="usual"
                [style.left.%]="analysis().baseline * 100"
              ></span>
            </div>
            <p class="muted">
              {{ t().eatenBefore(finding.preceded, analysis().complaints) }}
            </p>
          </article>
        } @empty {
          <p class="card list-message">{{ t().nothingConspicuous }}</p>
        }

        @if (conspicuous().length > 0) {
          <p class="legend">
            <span class="usual"></span>
            {{ t().usualShare(percent(analysis().baseline)) }}
          </p>
        }

        @for (group of otherGroups(); track group.title) {
          @if (group.findings.length > 0) {
            <details class="card">
              <summary>
                {{ group.title }} ({{ group.findings.length }})
                <app-icon name="chevron-down" />
              </summary>
              <p class="hint">{{ group.hint }}</p>
              <ul>
                @for (finding of group.findings; track finding.itemId) {
                  <li>
                    <button
                      type="button"
                      class="name"
                      (click)="showDetails(finding)"
                      [title]="t().showDetails"
                    >
                      {{ finding.name }}
                    </button>
                    <span class="count">
                      {{ t().followedShort(finding.followed, finding.eaten) }}
                    </span>
                  </li>
                }
              </ul>
            </details>
          }
        }

        <p class="note">{{ t().reportNote }}</p>
      }
    </section>

    <section>
      <h3>{{ t().export }}</h3>
      <div class="card export">
        <p>{{ t().exportHint }}</p>
        <button type="button" (click)="exportExcel()" [disabled]="!data()">
          <app-icon name="download" /> {{ t().exportExcel }}
          <kbd class="kbd">X</kbd>
        </button>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 16px;

        /* The hue of the discomfort scale of the month view */
        --discomfort: #d2401a;
      }

      :host-context([data-theme='dark']) {
        --discomfort: #ff6a3d;
      }

      .page-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
      }

      h3 {
        margin: 8px 0 8px 4px;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
      }

      section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      section h3 {
        margin-bottom: 0;
      }

      .settings {
        gap: 18px;
        padding: 16px;
      }

      .setting {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-muted);
      }

      .dates {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-muted);
      }

      input[type='date'],
      .setting ::ng-deep app-search-select input {
        flex: 1;
        min-width: 0;
        width: 100%;
        min-height: 44px;
        padding: 10px 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
        color: var(--text);
        font-size: 1rem;
        outline: none;
      }

      .setting ::ng-deep app-search-select input {
        padding-right: 40px;
      }

      .presets {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .presets button {
        padding: 6px 12px;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--surface);
        color: var(--text);
        font-size: 0.8rem;
        cursor: pointer;
      }

      .presets button.active {
        border-color: var(--primary);
        background: var(--primary-soft);
        color: var(--primary);
        font-weight: 600;
      }

      .segments {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 4px;
        padding: 4px;
        border-radius: var(--radius);
        background: var(--bg);
      }

      .segments button {
        min-height: 36px;
        border: none;
        border-radius: 9px;
        background: none;
        color: var(--text-muted);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
      }

      .segments button.active {
        background: var(--surface);
        color: var(--primary);
        box-shadow: var(--shadow);
      }

      .hint,
      .note,
      .summary,
      .muted,
      .legend {
        margin: 0;
        font-size: 0.85rem;
        color: var(--text-muted);
      }

      .summary {
        padding: 0 4px;
      }

      .finding {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 14px 16px;
      }

      .finding .name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.05rem;
        font-weight: 600;
      }

      .finding .name app-icon {
        color: var(--text-muted);
      }

      .finding p {
        margin: 0;
        font-size: 0.95rem;
      }

      .bar {
        position: relative;
        height: 10px;
        border-radius: 5px;
        background: var(--bg);
      }

      .fill {
        display: block;
        height: 100%;
        min-width: 4px;
        border-radius: 5px;
        background: var(--discomfort);
      }

      /* Marks what is usual for all meals */
      .usual {
        position: absolute;
        top: -3px;
        bottom: -3px;
        width: 2px;
        background: var(--text);
      }

      .legend {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 4px;
      }

      .legend .usual {
        position: static;
        height: 14px;
      }

      details {
        padding: 0 16px;
      }

      summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 0;
        font-weight: 600;
        cursor: pointer;
        list-style: none;
      }

      summary::-webkit-details-marker {
        display: none;
      }

      details[open] summary app-icon {
        transform: rotate(180deg);
      }

      details li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 0;
        border-top: 1px solid var(--border);
      }

      details .hint {
        padding-bottom: 12px;
      }

      .count {
        flex: none;
        font-size: 0.85rem;
        font-variant-numeric: tabular-nums;
        color: var(--text-muted);
      }

      .note {
        padding: 4px;
      }

      .export {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
      }

      .export p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--text-muted);
      }

      .export button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 48px;
        border: none;
        border-radius: var(--radius);
        background: var(--primary);
        color: var(--on-primary);
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
      }

      .export .kbd {
        border-color: currentColor;
        background: none;
        color: inherit;
        opacity: 0.75;
      }

      .export button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      /* Wide screens: the settings stay at the side of the results */
      @media (min-width: 1024px) {
        :host {
          display: grid;
          grid-template-columns: 360px minmax(0, 760px);
          grid-template-rows: auto auto 1fr;
          grid-template-areas:
            'title title'
            'settings findings'
            'export findings';
          align-items: start;
          gap: 16px 32px;
        }

        .page-title {
          grid-area: title;
          font-size: 2rem;
        }

        .settings {
          grid-area: settings;
        }

        :host > section:nth-of-type(2) {
          grid-area: findings;
        }

        :host > section:nth-of-type(2) h3,
        :host > section:nth-of-type(3) h3 {
          margin-top: 0;
        }

        :host > section:nth-of-type(3) {
          grid-area: export;
        }
      }
    `,
  ],
})
export class ReportComponent implements OnInit {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly symptomStore = inject(SymptomStore);
  private readonly uiStore = inject(UiStore);
  private readonly reportStore = inject(ReportStore);
  private readonly sync = inject(OfflineDataAccessService);

  protected readonly periods = PERIODS;
  protected readonly timeSpans = TIME_SPANS;

  // The settings live in the store, so they survive leaving the page
  protected readonly from = this.reportStore.from;
  protected readonly to = this.reportStore.to;
  protected readonly symptomId = this.reportStore.symptomId;
  protected readonly hours = this.reportStore.hours;

  protected readonly data = signal<ReportData | null>(null);

  protected readonly analysis = computed(() => {
    const data = this.data();
    const symptomId = this.symptomId();
    if (!data) return analyze([], [], this.hours());

    // A dish counts itself and as each of the foods it consists of
    const exposures = data.meals.flatMap((meal): Exposure[] => [
      {
        itemId: meal.itemId,
        name: meal.name,
        kind: meal.kind,
        entryId: meal.id,
        time: meal.time,
      },
      ...meal.ingredients.map((ingredient) => ({
        itemId: ingredient.id,
        name: ingredient.name,
        kind: 'food' as const,
        entryId: meal.id,
        time: meal.time,
      })),
    ]);
    const complaints = data.symptoms.filter(
      (symptom) => !symptomId || symptom.symptomId === symptomId,
    );
    return analyze(exposures, complaints, this.hours());
  });

  protected readonly conspicuous = computed(() =>
    this.analysis().findings.filter(
      (finding) => finding.rating === 'conspicuous',
    ),
  );

  protected readonly otherGroups = computed(() => {
    const findings = this.analysis().findings;
    const t = this.t();
    return [
      {
        title: t.unremarkable,
        hint: t.unremarkableHint,
        findings: findings.filter(
          (finding) => finding.rating === 'unremarkable',
        ),
      },
      {
        title: t.tooFewData,
        hint: t.tooFewDataHint,
        findings: findings.filter((finding) => finding.rating === 'unclear'),
      },
    ];
  });

  constructor() {
    inject(Keyboard).bind({ x: () => this.exportExcel() });

    // Loads initially, for another period and after a synchronization
    effect(() => {
      const from = this.from();
      const to = this.to();
      this.sync.revision();
      untracked(() => void this.load(from, to));
    });
  }

  ngOnInit(): void {
    this.symptomStore.loadSymptoms();
  }

  private async load(from: string, to: string): Promise<void> {
    if (!from || !to) return;
    const data = await this.reportStore.load(
      new Date(`${from}T00:00`),
      // The last day is included
      addDays(new Date(`${to}T00:00`), 1),
    );
    // Another period may have been chosen in the meantime
    if (from === this.from() && to === this.to()) this.data.set(data);
  }

  protected setPeriod(days: number): void {
    this.from.set(daysAgo(days));
    this.to.set(toDateInputValue(new Date()));
  }

  protected isPeriod(days: number): boolean {
    return (
      this.from() === daysAgo(days) &&
      this.to() === toDateInputValue(new Date())
    );
  }

  protected percent(share: number): number {
    return Math.round(share * 100);
  }

  protected showDetails(finding: Finding): void {
    this.uiStore.edit(
      finding.kind === 'dish' ? 'view-dish' : 'view-food',
      finding.itemId,
    );
  }

  protected exportExcel(): void {
    const data = this.data();
    if (!data) return;

    const file = createXlsx(this.sheets(data));
    const url = URL.createObjectURL(new Blob([file], { type: XLSX_MIME_TYPE }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `foody_${this.from()}_${this.to()}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * One table with a block of rows per day: its meals, symptoms and
   * medications side by side, each in the order of the time, and an empty row
   * after it
   */
  private sheets(data: ReportData): Sheet[] {
    const t = this.t();
    const time = (date: Date): Cell => ({ date, show: 'time' });
    const join = (...parts: string[]) => parts.filter(Boolean).join(' ');

    const meals = data.meals.map((meal) => ({
      time: meal.time,
      cells: [
        time(meal.time),
        // The foods of a dish are what may matter
        meal.ingredients.length > 0
          ? `${meal.name} (${meal.ingredients.map((ingredient) => ingredient.name).join(', ')})`
          : meal.name,
        join(meal.amount, this.i18n.name(meal.unit)),
      ] as Cell[],
    }));
    const medications = data.medications.map((entry) => ({
      time: entry.time,
      cells: [
        time(entry.time),
        join(entry.name, entry.strength),
        join(entry.amount, this.i18n.name(entry.unit)),
        entry.comment,
      ] as Cell[],
    }));
    const symptoms = [
      ...data.symptoms.map((entry) => ({
        time: entry.time,
        cells: [
          time(entry.time),
          entry.name,
          entry.level,
          entry.comment,
        ] as Cell[],
      })),
      // The follow-ups stand between the symptoms, at their own time
      ...data.followUps.map((followUp) => ({
        time: followUp.time,
        cells: [
          time(followUp.time),
          `↳ ${followUp.name}: ${t.courses[followUp.course]}`,
          followUp.level,
          followUp.comment,
        ] as Cell[],
      })),
    ].sort((a, b) => a.time.getTime() - b.time.getTime());
    const groups = [
      { title: t.meals, width: 3, entries: meals },
      { title: t.symptoms, width: 4, entries: symptoms },
      { title: t.medications, width: 4, entries: medications },
    ];

    const days = [
      ...new Set(
        groups.flatMap((group) =>
          group.entries.map((entry) => dayKey(entry.time)),
        ),
      ),
    ].sort();

    const rows: Cell[][] = [];
    // The days alternate between two colors, the row between them has none
    const bands: number[] = [];
    for (const [dayIndex, day] of days.entries()) {
      const ofDay = groups.map((group) =>
        group.entries.filter((entry) => dayKey(entry.time) === day),
      );
      const date = new Date(`${day}T00:00`);
      const height = Math.max(...ofDay.map((entries) => entries.length));

      for (let line = 0; line < height; line++) {
        bands.push((dayIndex % 2) + 1);
        rows.push([
          // The day stands in the first row of its block only
          ...(line === 0
            ? [{ date, show: 'date' } as Cell, this.i18n.formatWeekday(date)]
            : [null, null]),
          ...groups.flatMap(
            (group, index) =>
              ofDay[index][line]?.cells ??
              new Array<Cell>(group.width).fill(null),
          ),
        ]);
      }
      rows.push([]);
      bands.push(0);
    }

    return [
      {
        name: 'foody',
        groups: [
          { title: '', columns: 2 },
          ...groups.map((group) => ({
            title: group.title,
            columns: group.width,
          })),
        ],
        header: [
          t.day,
          t.weekday,
          t.time,
          t.mealName,
          t.amount,
          t.time,
          t.symptom,
          t.discomfortLevel,
          t.comment,
          t.time,
          t.medication,
          t.amount,
          t.comment,
        ],
        rows,
        bands,
      },
    ];
  }
}
