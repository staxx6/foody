import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DATA_ACCESS } from '@foody/pocketbase-access';
import { dayRange } from '../shared/date-utils';

/** A note on a day, e.g. why nothing was logged */
export type Note = {
  id: string;
  text: string;
  date: string;
};

/** What is entered for a note */
export type NoteInput = {
  date: string;
  text: string;
};

type NoteState = {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
};

export const NoteStore = signalStore(
  { providedIn: 'root' },
  withState<NoteState>({
    notes: [],
    isLoading: false,
    error: null,
  }),
  withMethods((store, dataAccess = inject(DATA_ACCESS)) => ({
    /** Loads the notes of a day */
    async loadNotes(day: Date) {
      patchState(store, { isLoading: true, error: null });
      try {
        const notes = await dataAccess.list<Note>({
          collectionName: 'notes',
          options: { dateRange: dayRange('date', day), sort: 'date' },
          map: (record) => ({
            id: record.id,
            text: String(record['text'] ?? ''),
            date: String(record['date'] ?? record.created),
          }),
        });
        patchState(store, { notes, isLoading: false });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        patchState(store, { isLoading: false, error: message });
      }
    },

    getNote(id: string): Promise<NoteInput | null> {
      return dataAccess.getOne({
        collectionName: 'notes',
        id,
        map: (record) => ({
          date: String(record['date'] ?? record.created),
          text: String(record['text'] ?? ''),
        }),
      });
    },

    /** @returns the id of the new note */
    async createNote(input: NoteInput): Promise<string> {
      const note = await dataAccess.create({
        collectionName: 'notes',
        data: input,
        map: (record) => record,
      });
      return note.id;
    },

    async updateNote(id: string, input: NoteInput): Promise<void> {
      await dataAccess.update({
        collectionName: 'notes',
        id,
        data: input,
        map: (record) => record,
      });
    },

    async deleteNote(id: string): Promise<void> {
      await dataAccess.delete({ collectionName: 'notes', id });
      patchState(store, {
        notes: store.notes().filter((note) => note.id !== id),
      });
    },
  })),
);
