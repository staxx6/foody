/**
 * All texts of the user interface. English is the reference: the other
 * languages have to provide exactly the same keys.
 */
const en = {
  // General
  back: 'Back',
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving…',
  saveAnyway: 'Save anyway',
  savingFailed: 'Saving failed',
  optional: 'optional',
  loading: 'Loading…',
  name: 'Name',
  description: 'Description',
  comment: 'Comment',
  amount: 'Amount',
  unit: 'Unit',
  day: 'Day',
  time: 'Time',
  food: 'Food',
  dish: 'Dish',
  symptom: 'Symptom',
  useExisting: 'Use existing',
  search: 'Search…',
  noMatches: 'No matches',
  clearSelection: 'Clear selection',

  // Photos
  photos: 'Photos',
  addPhoto: 'Add photo',
  removePhoto: (name: string) => `Remove ${name}`,

  // Home
  today: 'Today',
  meals: 'Meals',
  health: 'Health',
  noMeals: 'No meals logged today.',
  noSymptoms: 'No symptoms logged today.',
  discomfortLevel: 'Discomfort level',

  // Navigation
  month: 'Month',
  report: 'Report',
  settings: 'Settings',
  comingSoon: 'Coming soon',
  addEntry: 'Add entry',
  closeMenu: 'Close menu',

  // Menu of the add button
  trackToday: 'Track today',
  trackTodayHint: 'Record what happened, with date and time.',
  logMeal: 'Log meal',
  logMealHint: 'I ate or drank something',
  logSymptom: 'Log symptom',
  logSymptomHint: 'I noticed a symptom',
  addToLists: 'Add to your lists',
  addToListsHint:
    'What you can pick when logging. Add it once, use it any time.',
  newFood: 'New food',
  newFoodHint: 'A single food, e.g. apple or milk',
  newDish: 'New dish',
  newDishHint: 'Several foods together, e.g. lasagne',
  newSymptom: 'New symptom',
  newSymptomHint: 'Something you can feel, e.g. headache',

  // Log meal
  whatDidYouEat: 'What did you eat or drink?',
  singleFood: 'Single food',
  selectFood: 'Search food…',
  selectDish: 'Search dish…',
  createNewFood: '+ Create new food',
  createNewDish: '+ Create new dish',
  createNewUnit: '+ Create new unit',
  unitPlaceholder: 'e.g. ml',
  add: 'Add',
  adding: 'Adding…',
  addingFailed: 'Adding failed',

  // Log symptom
  selectSymptom: 'Search symptom…',
  createNewSymptom: '+ Create new symptom',
  discomfortLevelRange: 'Discomfort level (1–100)',

  // Creating foods, dishes and symptoms
  foodPlaceholder: 'e.g. apple',
  dishPlaceholder: 'e.g. lasagne',
  symptomPlaceholder: 'e.g. headache',
  foodExists: (name: string) => `A food named “${name}” already exists.`,
  dishExists: (name: string) => `A dish named “${name}” already exists.`,
  symptomExists: (name: string) => `A symptom named “${name}” already exists.`,
  ingredients: 'Ingredients',
  addIngredient: '+ Add ingredient',
  removeIngredient: 'Remove ingredient',

  // Settings
  appearance: 'Appearance',
  language: 'Language',
  theme: 'Theme',
  system: 'System',
  light: 'Light',
  dark: 'Dark',
  color: 'Color',
  accents: {
    indigo: 'Indigo',
    teal: 'Teal',
    coral: 'Coral',
    plum: 'Plum',
    green: 'Green',
  },

  // Synchronization
  synchronization: 'Synchronization',
  server: 'Server',
  reachable: 'Reachable',
  notReachable: 'Not reachable',
  lastSynchronized: 'Last synchronized',
  never: 'Never',
  waitingToBeSent: 'Waiting to be sent',
  synchronizeNow: 'Synchronize now',
  synchronizing: 'Synchronizing…',
  synced: 'Synced',
  offline: 'Offline',
  syncProblem: 'Sync problem',
  toSend: (count: number) => `${count} to send`,
  tapToSend: 'Tap to send',
  offlineHint:
    'Server not reachable. Entries are kept on this device. Tap to retry.',

  // Deleting
  ok: 'OK',
  delete: 'Delete',
  deleteNamed: (name: string) => `Delete ${name}`,
  deleteTitle: 'Delete permanently?',
  deleteMessage: (name: string) =>
    `“${name}” will be deleted on all your devices. This cannot be undone.`,
  cannotDeleteTitle: 'Cannot be deleted',
  stillUsed: (name: string, count: number) =>
    `“${name}” is still used by ${count} ${count === 1 ? 'entry' : 'entries'}. Delete ${count === 1 ? 'it' : 'them'} first.`,
  deletingFailed: 'Deleting failed',

  // Editing
  editNamed: (name: string) => `Edit ${name}`,
  editMeal: 'Edit meal',
  editSymptomEntry: 'Edit symptom entry',
  editFood: 'Edit food',
  editDish: 'Edit dish',
  editSymptom: 'Edit symptom',
  editUnit: 'Edit unit',
  nameGerman: 'German name',
  nameEnglish: 'English name',
  translatedNameHint:
    'Shown instead of the name when the app is used in that language.',

  // Managing the lists
  manageLists: 'Manage lists',
  manageListsHint: 'View, edit and delete foods, dishes, symptoms and units',
  foods: 'Foods',
  dishes: 'Dishes',
  symptoms: 'Symptoms',
  units: 'Units',
  emptyList: 'Nothing here yet.',
};

export type Translations = typeof en;

const de: Translations = {
  back: 'Zurück',
  cancel: 'Abbrechen',
  save: 'Speichern',
  saving: 'Speichert…',
  saveAnyway: 'Trotzdem speichern',
  savingFailed: 'Speichern fehlgeschlagen',
  optional: 'optional',
  loading: 'Lädt…',
  name: 'Name',
  description: 'Beschreibung',
  comment: 'Kommentar',
  amount: 'Menge',
  unit: 'Einheit',
  day: 'Tag',
  time: 'Uhrzeit',
  food: 'Lebensmittel',
  dish: 'Gericht',
  symptom: 'Symptom',
  useExisting: 'Vorhandenes verwenden',
  search: 'Suchen…',
  noMatches: 'Keine Treffer',
  clearSelection: 'Auswahl aufheben',

  photos: 'Fotos',
  addPhoto: 'Foto hinzufügen',
  removePhoto: (name) => `${name} entfernen`,

  today: 'Heute',
  meals: 'Mahlzeiten',
  health: 'Befinden',
  noMeals: 'Heute ist noch keine Mahlzeit eingetragen.',
  noSymptoms: 'Heute ist noch kein Symptom eingetragen.',
  discomfortLevel: 'Beschwerdegrad',

  month: 'Monat',
  report: 'Auswertung',
  settings: 'Einstellungen',
  comingSoon: 'Kommt noch',
  addEntry: 'Eintrag hinzufügen',
  closeMenu: 'Menü schließen',

  trackToday: 'Heute eintragen',
  trackTodayHint: 'Festhalten, was passiert ist – mit Datum und Uhrzeit.',
  logMeal: 'Mahlzeit eintragen',
  logMealHint: 'Ich habe etwas gegessen oder getrunken',
  logSymptom: 'Symptom eintragen',
  logSymptomHint: 'Ich habe ein Symptom bemerkt',
  addToLists: 'Listen erweitern',
  addToListsHint:
    'Was du beim Eintragen auswählen kannst. Einmal anlegen, immer wieder nutzen.',
  newFood: 'Neues Lebensmittel',
  newFoodHint: 'Ein einzelnes Lebensmittel, z. B. Apfel oder Milch',
  newDish: 'Neues Gericht',
  newDishHint: 'Mehrere Lebensmittel zusammen, z. B. Lasagne',
  newSymptom: 'Neues Symptom',
  newSymptomHint: 'Etwas, das du spürst, z. B. Kopfschmerzen',

  whatDidYouEat: 'Was hast du gegessen oder getrunken?',
  singleFood: 'Lebensmittel',
  selectFood: 'Lebensmittel suchen…',
  selectDish: 'Gericht suchen…',
  createNewFood: '+ Neues Lebensmittel anlegen',
  createNewDish: '+ Neues Gericht anlegen',
  createNewUnit: '+ Neue Einheit anlegen',
  unitPlaceholder: 'z. B. ml',
  add: 'Anlegen',
  adding: 'Wird angelegt…',
  addingFailed: 'Anlegen fehlgeschlagen',

  selectSymptom: 'Symptom suchen…',
  createNewSymptom: '+ Neues Symptom anlegen',
  discomfortLevelRange: 'Beschwerdegrad (1–100)',

  foodPlaceholder: 'z. B. Apfel',
  dishPlaceholder: 'z. B. Lasagne',
  symptomPlaceholder: 'z. B. Kopfschmerzen',
  foodExists: (name) => `Ein Lebensmittel namens „${name}“ gibt es schon.`,
  dishExists: (name) => `Ein Gericht namens „${name}“ gibt es schon.`,
  symptomExists: (name) => `Ein Symptom namens „${name}“ gibt es schon.`,
  ingredients: 'Zutaten',
  addIngredient: '+ Zutat hinzufügen',
  removeIngredient: 'Zutat entfernen',

  appearance: 'Darstellung',
  language: 'Sprache',
  theme: 'Design',
  system: 'System',
  light: 'Hell',
  dark: 'Dunkel',
  color: 'Farbe',
  accents: {
    indigo: 'Indigo',
    teal: 'Türkis',
    coral: 'Koralle',
    plum: 'Pflaume',
    green: 'Grün',
  },

  synchronization: 'Synchronisierung',
  server: 'Server',
  reachable: 'Erreichbar',
  notReachable: 'Nicht erreichbar',
  lastSynchronized: 'Zuletzt abgeglichen',
  never: 'Nie',
  waitingToBeSent: 'Warten auf Versand',
  synchronizeNow: 'Jetzt abgleichen',
  synchronizing: 'Gleicht ab…',
  synced: 'Abgeglichen',
  offline: 'Offline',
  syncProblem: 'Abgleich-Problem',
  toSend: (count) => `${count} zu senden`,
  tapToSend: 'Tippen zum Senden',
  offlineHint:
    'Server nicht erreichbar. Einträge bleiben auf diesem Gerät. Tippen zum Wiederholen.',

  ok: 'OK',
  delete: 'Löschen',
  deleteNamed: (name) => `${name} löschen`,
  deleteTitle: 'Endgültig löschen?',
  deleteMessage: (name) =>
    `„${name}“ wird auf allen deinen Geräten gelöscht. Das lässt sich nicht rückgängig machen.`,
  cannotDeleteTitle: 'Löschen nicht möglich',
  stillUsed: (name, count) =>
    `„${name}“ wird noch von ${count} ${count === 1 ? 'Eintrag' : 'Einträgen'} verwendet. Lösche ${count === 1 ? 'ihn' : 'sie'} zuerst.`,
  deletingFailed: 'Löschen fehlgeschlagen',

  editNamed: (name) => `${name} bearbeiten`,
  editMeal: 'Mahlzeit bearbeiten',
  editSymptomEntry: 'Symptom-Eintrag bearbeiten',
  editFood: 'Lebensmittel bearbeiten',
  editDish: 'Gericht bearbeiten',
  editSymptom: 'Symptom bearbeiten',
  editUnit: 'Einheit bearbeiten',
  nameGerman: 'Deutscher Name',
  nameEnglish: 'Englischer Name',
  translatedNameHint:
    'Wird statt des Namens angezeigt, wenn die App in dieser Sprache läuft.',

  manageLists: 'Listen verwalten',
  manageListsHint:
    'Lebensmittel, Gerichte, Symptome und Einheiten ansehen, bearbeiten und löschen',
  foods: 'Lebensmittel',
  dishes: 'Gerichte',
  symptoms: 'Symptome',
  units: 'Einheiten',
  emptyList: 'Noch nichts vorhanden.',
};

export const TRANSLATIONS = { en, de };
export type Language = keyof typeof TRANSLATIONS;
