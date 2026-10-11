import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS, DataRecord } from '@foody/pocketbase-access';
import { ExistingImage } from '../shared/image-picker.component';

export type Medication = {
  id: string;
  name: string;
  /** e.g. "400 mg", as printed on the package */
  strength: string;
  /** The dose that is suggested when logging an intake */
  defaultAmount: string;
  defaultUnitId: string;
};

/** What is entered for a medication */
export type MedicationInput = {
  name: string;
  activeIngredient: string;
  strength: string;
  description: string;
  defaultAmount: string;
  defaultUnitId: string;
};

/** Everything of a medication that can be edited */
export type MedicationDetails = MedicationInput & { images: ExistingImage[] };

type MedicationState = {
  medications: Medication[];
  isLoading: boolean;
};

function toMedication(record: DataRecord): Medication {
  return {
    id: record.id,
    name: String(record['name'] ?? ''),
    strength: String(record['strength'] ?? ''),
    defaultAmount: String(record['defaultAmount'] ?? ''),
    defaultUnitId: String(record['to_defaultUnit'] ?? ''),
  };
}

function toData(input: MedicationInput): Record<string, unknown> {
  return {
    name: input.name,
    activeIngredient: input.activeIngredient,
    strength: input.strength,
    description: input.description,
    defaultAmount: input.defaultAmount,
    to_defaultUnit: input.defaultUnitId,
  };
}

export const MedicationStore = signalStore(
  { providedIn: 'root' },
  withState<MedicationState>({ medications: [], isLoading: false }),
  withMethods((store, dataAccess = inject(DATA_ACCESS)) => {
    async function loadMedications(): Promise<void> {
      patchState(store, { isLoading: true });
      try {
        const medications = await dataAccess.list<Medication>({
          collectionName: 'medications',
          options: { sort: 'name' },
          map: toMedication,
        });
        patchState(store, { medications, isLoading: false });
      } catch {
        patchState(store, { isLoading: false });
      }
    }

    return {
      loadMedications,

      getMedication(id: string): Promise<MedicationDetails | null> {
        return dataAccess.getOne({
          collectionName: 'medications',
          id,
          map: (record) => ({
            name: String(record['name'] ?? ''),
            activeIngredient: String(record['activeIngredient'] ?? ''),
            strength: String(record['strength'] ?? ''),
            description: String(record['description'] ?? ''),
            defaultAmount: String(record['defaultAmount'] ?? ''),
            defaultUnitId: String(record['to_defaultUnit'] ?? ''),
            images: ((record['images'] as string[] | undefined) ?? []).map(
              (name) => ({ name, url: dataAccess.getFileUrl(record, name) }),
            ),
          }),
        });
      },

      async createMedication(
        input: MedicationInput,
        images: File[] = [],
      ): Promise<Medication> {
        const medication = await dataAccess.create<Medication>({
          collectionName: 'medications',
          data: { ...toData(input), images },
          map: toMedication,
        });
        patchState(store, {
          medications: [...store.medications(), medication].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        });
        return medication;
      },

      async updateMedication(
        id: string,
        input: MedicationInput,
        addedImages: File[],
        removedImages: string[],
      ): Promise<Medication> {
        const data = toData(input);
        if (addedImages.length > 0) data['images+'] = addedImages;
        if (removedImages.length > 0) data['images-'] = removedImages;
        const medication = await dataAccess.update<Medication>({
          collectionName: 'medications',
          id,
          data,
          map: toMedication,
        });
        await loadMedications();
        return medication;
      },

      async deleteMedication(id: string): Promise<void> {
        await dataAccess.delete({ collectionName: 'medications', id });
        patchState(store, {
          medications: store
            .medications()
            .filter((medication) => medication.id !== id),
        });
      },
    };
  }),
);
