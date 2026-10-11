import {
  ChangeDetectorRef,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AmountUnitStore } from './amount-unit-store';
import { I18n } from './i18n/i18n';
import { AutofocusDirective } from './keyboard/autofocus.directive';
import { IconComponent } from './icon.component';

/**
 * Changes the names of a unit. Units are created while logging a meal.
 */
@Component({
  selector: 'app-edit-unit-form',
  imports: [FormsModule, AutofocusDirective, IconComponent],
  template: `
    <div class="form-header">
      <button
        type="button"
        class="back-btn"
        (click)="cancelled.emit()"
        [attr.aria-label]="t().back"
      >
        <app-icon name="back" />
      </button>
      <h2>{{ t().editUnit }}</h2>
    </div>

    <form class="card" (ngSubmit)="save()">
      <div class="field">
        <label for="unit-name">{{ t().name }} *</label>
        <input
          id="unit-name"
          appAutofocus
          name="name"
          [(ngModel)]="name"
          required
        />
      </div>

      <div class="field">
        <label for="unit-name-de">{{ t().nameGerman }}</label>
        <input
          id="unit-name-de"
          name="nameDe"
          [(ngModel)]="nameDe"
          [placeholder]="t().optional"
        />
      </div>

      <div class="field">
        <label for="unit-name-en">{{ t().nameEnglish }}</label>
        <input
          id="unit-name-en"
          name="nameEn"
          [(ngModel)]="nameEn"
          [placeholder]="t().optional"
        />
        <p class="hint">{{ t().translatedNameHint }}</p>
      </div>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <div class="actions">
        <button type="button" class="secondary" (click)="cancelled.emit()">
          {{ t().cancel }}
        </button>
        <button type="submit" [disabled]="!name.trim() || isSaving()">
          {{ isSaving() ? t().saving : t().save }}
        </button>
      </div>
    </form>
  `,
  styles: [
    `
      .hint {
        margin: 0;
        font-size: 0.8rem;
        color: var(--text-muted);
      }
    `,
  ],
})
export class EditUnitFormComponent implements OnInit {
  protected readonly t = inject(I18n).t;
  private readonly unitStore = inject(AmountUnitStore);
  private readonly changes = inject(ChangeDetectorRef);

  readonly editId = input<string | null>(null);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  name = '';
  nameDe = '';
  nameEn = '';
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.unitStore.loadUnits();
    const unit = this.unitStore
      .units()
      .find((other) => other.id === this.editId());
    if (!unit) return;

    this.name = unit.name;
    this.nameDe = unit.nameDe;
    this.nameEn = unit.nameEn;
    this.changes.markForCheck();
  }

  async save(): Promise<void> {
    const id = this.editId();
    if (!id || !this.name.trim() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      await this.unitStore.updateUnit(id, {
        name: this.name.trim(),
        nameDe: this.nameDe.trim(),
        nameEn: this.nameEn.trim(),
      });
      this.saved.emit();
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : this.t().savingFailed,
      );
      this.isSaving.set(false);
    }
  }
}
