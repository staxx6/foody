/// <reference path="../pb_data/types.d.ts" />

// The reference data gets optional translations of its name. `name` stays the
// name as entered; the app shows `name_de` / `name_en` if it is filled.
const COLLECTIONS = ["amountUnitET", "symptomTypeET", "symptomLocationET"]
const FIELDS = ["name_de", "name_en"]

migrate((app) => {
  for (const name of COLLECTIONS) {
    const collection = app.findCollectionByNameOrId(name)
    for (const field of FIELDS) {
      collection.fields.add(new Field({ "name": field, "type": "text" }))
    }
    app.save(collection)
  }

  // Translations of the records that exist so far
  const translations = {
    "amountUnitET": {
      "matchBy": "code",
      "values": {
        "kg": { "name_de": "Kilogramm" },
        "g": { "name_de": "Gramm" },
        "piece": { "name_de": "Stück" },
        "serving": { "name_de": "Portion" }
      }
    },
    "symptomTypeET": {
      "matchBy": "name",
      "values": { "Schmerz": { "name_en": "Pain" } }
    },
    "symptomLocationET": {
      "matchBy": "name",
      "values": { "Kopf": { "name_en": "Head" } }
    }
  }

  for (const name of COLLECTIONS) {
    const { matchBy, values } = translations[name]
    for (const record of app.findAllRecords(name)) {
      const translation = values[record.getString(matchBy)]
      if (!translation) continue
      for (const field in translation) record.set(field, translation[field])
      app.save(record)
    }
  }
}, (app) => {
  for (const name of COLLECTIONS) {
    const collection = app.findCollectionByNameOrId(name)
    for (const field of FIELDS) collection.fields.removeByName(field)
    app.save(collection)
  }
})
