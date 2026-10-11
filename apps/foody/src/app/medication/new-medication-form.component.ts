import {
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AmountUnitStore } from '../shared/amount-unit-store';
import { I18n } from '../shared/i18n/i18n';
import { IconComponent } from '../shared/icon.component';
import {
  ExistingImage,
  ImagePickerComponent,
} from '../shared/image-picker.component';
import { findByName } from '../shared/name-utils';
import { SearchSelectComponent } from '../shared/search/search-select.component';
import { MedicationInput, MedicationStore } from './medication-store';

// Most medications are taken as one tablet
const DEFAULT_AMOUNT = '1';
const DEFAULT_UNIT_CODE = 'tablet';

@Component({
  selector: 'app-new-medication-form',
  imports: [
    FormsModule,
    IconComponent,
    ImagePickerComponent,
    SearchSelectComponent,
  ],
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
      <h2>{{ editId() ? t().editMedication : t().newMedication }}</h2>
    </div>

    <form class="card" (ngSubmit)="save()">
      <div class="field">
        <label for="medication-name">{{ t().name }} *</label>
        <input
          id="medication-name"
          name="name"
          [(ngModel)]="name"
          [placeholder]="t().medicationPlaceholder"
          required
        />
        @if (existing(); as duplicate) {
          <p class="warning">
            <span>{{ t().medicationExists(duplicate.name) }}</span>
            <button type="button" class="link" (click)="saved.emit(duplicate)">
              {{ t().useExisting }}
            </button>
          </p>
        }
      </div>

      <div class="field-row">
        <div class="field">
          <label for="medication-strength">{{ t().strength }}</label>
          <input
            id="medication-strength"
            name="strength"
            [(ngModel)]="strength"
            [placeholder]="t().strengthPlaceholder"
          />
        </div>
        <div class="field">
          <label for="medication-ingredient">{{ t().activeIngredient }}</label>
          <input
            id="medication-ingredient"
            name="activeIngredient"
            [(ngModel)]="activeIngredient"
            [placeholder]="t().optional"
          />
        </div>
      </div>

      <div class="field-row dose">
        <div class="field">
          <label for="medication-amount">{{ t().usualDose }}</label>
          <input
            id="medication-amount"
            name="defaultAmount"
            [(ngModel)]="defaultAmount"
          />
        </div>
        <div class="field">
          <label for="medication-unit">{{ t().unit }}</label>
          <app-search-select
            inputId="medication-unit"
            [options]="unitOptions()"
            [(value)]="defaultUnitId"
            [placeholder]="t().search"
          />
        </div>
      </div>
      <p class="hint">{{ t().usualDoseHint }}</p>

      <div class="field">
        <label for="medication-description">{{ t().description }}</label>
        <textarea
          id="medication-description"
          name="description"
          [(ngModel)]="description"
          rows="3"
          [placeholder]="t().medicationDescriptionPlaceholder"
        ></textarea>
      </div>

      <div class="field">
        <span class="label">{{ t().photos }}</span>
        <app-image-picker [(files)]="images" [(existing)]="existingImages" />
      </div>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <div class="actions">
        <button type="button" class="secondary" (click)="cancelled.emit()">
          {{ t().cancel }}
        </button>
        <button type="submit" [disabled]="!name.trim() || isSaving()">
          {{ isSaving() ? t().saving : existing() ? t().saveAnyway : t().save }}
        </button>
      </div>
    </form>
  `,
  styles: [
    `
      .field-row {
        margin-bottom: 12px;
      }

      .field-row.dose {
        margin-bottom: 0;
      }

      .hint {
        margin: 0 0 18px;
        font-size: 0.8rem;
        color: var(--text-muted);
      }
    `,
  ],
})
export class NewMedicationFormComponent implements OnInit {
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly medicationStore = inject(MedicationStore);
  private readonly unitStore = inject(AmountUnitStore);
  private readonly changes = inject(ChangeDetectorRef);

  /** The record to change; without it a new one is created */
  readonly editId = input<string | null>(null);

  /** The created or changed medication */
  readonly saved = output<{ id: string }>();
  readonly cancelled = output<void>();

  /** The units with their names in the current language */
  protected readonly unitOptions = computed(() =>
    this.unitStore
      .units()
      .map((unit) => ({ id: unit.id, name: this.i18n.name(unit) })),
  );

  name = '';
  strength = '';
  activeIngredient = '';
  description = '';
  defaultAmount = DEFAULT_AMOUNT;
  // Signal, as it is also set after loading
  readonly defaultUnitId = signal('');
  readonly images = signal<File[]>([]);
  /** The photos the medication has, minus the ones removed in the form */
  readonly existingImages = signal<ExistingImage[]>([]);
  private originalImages: ExistingImage[] = [];

  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    this.medicationStore.loadMedications();
    await this.unitStore.loadUnits();

    const id = this.editId();
    const medication = id ? await this.medicationStore.getMedication(id) : null;
    if (medication) {
      this.name = medication.name;
      this.strength = medication.strength;
      this.activeIngredient = medication.activeIngredient;
      this.description = medication.description;
      this.defaultAmount = medication.defaultAmount;
      this.defaultUnitId.set(medication.defaultUnitId);
      this.originalImages = medication.images;
      this.existingImages.set(medication.images);
    } else {
      const unit = this.unitStore
        .units()
        .find(({ code }) => code === DEFAULT_UNIT_CODE);
      this.defaultUnitId.set(unit?.id ?? '');
    }
    this.changes.markForCheck();
  }

  /** A record with the entered name, to warn about the duplicate */
  protected existing() {
    return findByName(
      this.medicationStore
        .medications()
        .filter((medication) => medication.id !== this.editId()),
      this.name,
    );
  }

  async save(): Promise<void> {
    if (!this.name.trim() || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const input: MedicationInput = {
        name: this.name.trim(),
        strength: this.strength.trim(),
        activeIngredient: this.activeIngredient.trim(),
        description: this.description.trim(),
        defaultAmount: this.defaultAmount.trim(),
        defaultUnitId: this.defaultUnitId(),
      };
      const id = this.editId();
      const medication = id
        ? await this.medicationStore.updateMedication(
            id,
            input,
            this.images(),
            this.originalImages
              .filter((image) => !this.existingImages().includes(image))
              .map((image) => image.name),
          )
        : await this.medicationStore.createMedication(input, this.images());
      this.saved.emit(medication);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : this.t().savingFailed,
      );
      this.isSaving.set(false);
    }
  }
}
