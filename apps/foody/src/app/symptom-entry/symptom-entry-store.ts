import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS, DataRecord } from '@foody/pocketbase-access';
import { dayRange } from '../shared/date-utils';

/** How a symptom developed since its entry or the follow-up before */
export const FOLLOW_UP_COURSES = ['better', 'same', 'worse', 'gone'] as const;
export type FollowUpCourse = (typeof FOLLOW_UP_COURSES)[number];

/** The collection of the follow-ups, which are deleted with their entry */
export const FOLLOW_UP_COLLECTION = 'symptomFollowUps';

/** How a symptom was some time after it was logged */
export type SymptomFollowUp = {
  id: string;
  /** The symptom entry it belongs to */
  entryId: string;
  date: string;
  course: FollowUpCourse;
  discomfortLevel: number | null;
  comment: string;
};

export type SymptomFollowUpInput = Omit<SymptomFollowUp, 'id'>;

export type SymptomEntry = {
  id: string;
  symptomId: string;
  symptomName: string;
  discomfortLevel: number | null;
  locationImageUrls: string[];
  date: string;
  /** In the order of their time */
  followUps: SymptomFollowUp[];
};

/** What is entered for a symptom entry */
export type SymptomEntryInput = {
  date: string;
  symptomId: string;
  discomfortLevel?: number | null;
  comment?: string;
};

type SymptomEntryState = {
  entries: SymptomEntry[];
  isLoading: boolean;
  error: string | null;
};

const initialState: SymptomEntryState = {
  entries: [],
  isLoading: false,
  error: null,
};

function toFollowUp(record: DataRecord): SymptomFollowUp {
  const course = String(record['course'] ?? '') as FollowUpCourse;
  return {
    id: record.id,
    entryId: String(record['to_symptomEntry'] ?? ''),
    date: record['date'] ? String(record['date']) : record.created,
    course: FOLLOW_UP_COURSES.includes(course) ? course : 'same',
    // PocketBase stores "no value" of a number as 0
    discomfortLevel: Number(record['discomfortLevel']) || null,
    comment: String(record['comment'] ?? ''),
  };
}

function toFollowUpData(input: SymptomFollowUpInput): Record<string, unknown> {
  return {
    date: input.date,
    to_symptomEntry: input.entryId,
    course: input.course,
    discomfortLevel: input.discomfortLevel ?? null,
    comment: input.comment,
  };
}

export const SymptomEntryStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, dataAccess = inject(DATA_ACCESS)) => {
    /** All follow-ups, in the order of their time */
    const listFollowUps = () =>
      dataAccess.list<SymptomFollowUp>({
        collectionName: FOLLOW_UP_COLLECTION,
        options: { sort: 'date' },
        map: toFollowUp,
      });

    return {
      /** Loads the entries of a day with their follow-ups */
      async loadEntries(day: Date) {
        patchState(store, { isLoading: true, error: null });

        try {
          const [entries, followUps] = await Promise.all([
            dataAccess.list<SymptomEntry>({
              collectionName: 'symptomEntries',
              options: {
                dateRange: dayRange('date', day),
                expand: 'to_symptom,to_symptom.to_locations',
                sort: 'date',
              },
              map: (record) => {
                const expand = record['expand'] as
                  | Record<string, Record<string, unknown>>
                  | undefined;
                const symptom = expand?.['to_symptom'] as
                  | (Record<string, unknown> & {
                      expand?: Record<string, unknown>;
                    })
                  | undefined;
                const rawLocations = symptom?.['expand']?.['to_locations'];
                const locations = (
                  Array.isArray(rawLocations)
                    ? rawLocations
                    : rawLocations
                      ? [rawLocations]
                      : []
                ) as (Record<string, unknown> & DataRecord)[];

                const locationImageUrls = locations
                  .filter((loc) => loc['image'])
                  .map((loc) =>
                    dataAccess.getFileUrl(loc, String(loc['image'])),
                  );

                return {
                  id: record.id,
                  symptomId: String(record['to_symptom'] ?? ''),
                  symptomName: String(symptom?.['name'] ?? '-'),
                  discomfortLevel: Number(record['discomfortLevel']) || null,
                  locationImageUrls,
                  date: record['date']
                    ? String(record['date'])
                    : record.created,
                  followUps: [],
                };
              },
            }),
            listFollowUps(),
          ]);
          patchState(store, {
            // A follow-up is shown with its entry, also if it is a day later
            entries: entries.map((entry) => ({
              ...entry,
              followUps: followUps.filter(
                (followUp) => followUp.entryId === entry.id,
              ),
            })),
            isLoading: false,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          patchState(store, { isLoading: false, error: message });
        }
      },

      async createSymptomEntry(payload: {
        date: string;
        symptomId: string;
        discomfortLevel?: number | null;
        comment?: string;
      }): Promise<string> {
        const data: Record<string, unknown> = {
          date: payload.date,
          to_symptom: payload.symptomId,
        };
        if (payload.discomfortLevel != null)
          data['discomfortLevel'] = payload.discomfortLevel;
        if (payload.comment) data['comment'] = payload.comment;

        const entry = await dataAccess.create<SymptomEntry>({
          collectionName: 'symptomEntries',
          data,
          map: (record) => ({
            id: record.id,
            symptomId: String(record['to_symptom'] ?? ''),
            symptomName: '',
            discomfortLevel:
              record['discomfortLevel'] != null
                ? Number(record['discomfortLevel'])
                : null,
            locationImageUrls: [],
            date: record['date'] ? String(record['date']) : record.created,
            followUps: [],
          }),
        });
        return entry.id;
      },

      /** Deletes the entry together with its follow-ups */
      async deleteSymptomEntry(id: string): Promise<void> {
        const followUps = await listFollowUps();
        for (const followUp of followUps) {
          if (followUp.entryId !== id) continue;
          await dataAccess.delete({
            collectionName: FOLLOW_UP_COLLECTION,
            id: followUp.id,
          });
        }
        await dataAccess.delete({ collectionName: 'symptomEntries', id });
        patchState(store, {
          entries: store.entries().filter((item) => item.id !== id),
        });
      },

      getSymptomEntry(
        id: string,
      ): Promise<(SymptomEntryInput & { symptomName: string }) | null> {
        return dataAccess.getOne({
          collectionName: 'symptomEntries',
          id,
          expand: 'to_symptom',
          map: (record) => {
            const symptom = (
              record['expand'] as Record<string, DataRecord> | undefined
            )?.['to_symptom'];
            return {
              date: String(record['date'] ?? record.created),
              symptomId: String(record['to_symptom'] ?? ''),
              symptomName: String(symptom?.['name'] ?? '-'),
              // PocketBase stores "no value" of a number as 0
              discomfortLevel: Number(record['discomfortLevel']) || null,
              comment: String(record['comment'] ?? ''),
            };
          },
        });
      },

      async updateSymptomEntry(
        id: string,
        input: SymptomEntryInput,
      ): Promise<void> {
        await dataAccess.update({
          collectionName: 'symptomEntries',
          id,
          data: {
            date: input.date,
            to_symptom: input.symptomId,
            discomfortLevel: input.discomfortLevel ?? null,
            comment: input.comment ?? '',
          },
          map: (record) => record,
        });
      },

      /** The follow-ups of an entry, in the order of their time */
      async getFollowUps(entryId: string): Promise<SymptomFollowUp[]> {
        const followUps = await listFollowUps();
        return followUps.filter((followUp) => followUp.entryId === entryId);
      },

      getFollowUp(id: string): Promise<SymptomFollowUp | null> {
        return dataAccess.getOne({
          collectionName: FOLLOW_UP_COLLECTION,
          id,
          map: toFollowUp,
        });
      },

      async createFollowUp(input: SymptomFollowUpInput): Promise<void> {
        await dataAccess.create({
          collectionName: FOLLOW_UP_COLLECTION,
          data: toFollowUpData(input),
          map: toFollowUp,
        });
      },

      async updateFollowUp(
        id: string,
        input: SymptomFollowUpInput,
      ): Promise<void> {
        await dataAccess.update({
          collectionName: FOLLOW_UP_COLLECTION,
          id,
          data: toFollowUpData(input),
          map: toFollowUp,
        });
      },

      async deleteFollowUp(id: string): Promise<void> {
        await dataAccess.delete({ collectionName: FOLLOW_UP_COLLECTION, id });
        patchState(store, {
          entries: store.entries().map((entry) => ({
            ...entry,
            followUps: entry.followUps.filter((followUp) => followUp.id !== id),
          })),
        });
      },
    };
  }),
);
