/// <reference path="../pb_data/types.d.ts" />

// Medications: what can be taken (`medications`) and when it was taken
// (`medicationEntries`), analogous to food items and their entries.
const AUTODATES = [
  { "name": "created", "type": "autodate", "onCreate": true, "onUpdate": false },
  { "name": "updated", "type": "autodate", "onCreate": true, "onUpdate": true }
]
// Open like the other collections: the server is only reachable at home
const RULES = {
  "listRule": "",
  "viewRule": "",
  "createRule": "",
  "updateRule": "",
  "deleteRule": ""
}
// Units a dose is typically given in: code, name, German name
const UNITS = [
  ["tablet", "Tablet", "Tablette"],
  ["capsule", "Capsule", "Kapsel"],
  ["drop", "Drop", "Tropfen"],
  ["ml", "Milliliter", "Milliliter"],
  ["mg", "Milligram", "Milligramm"]
]

migrate((app) => {
  const units = app.findCollectionByNameOrId("amountUnitET")

  const medications = new Collection({
    ...RULES,
    "type": "base",
    "name": "medications",
    "fields": [
      { "name": "name", "type": "text", "required": true },
      { "name": "description", "type": "text" },
      { "name": "activeIngredient", "type": "text" },
      // e.g. "400 mg", as printed on the package
      { "name": "strength", "type": "text" },
      { "name": "images", "type": "file", "maxSelect": 10 },
      // The dose that is suggested when logging an intake
      { "name": "defaultAmount", "type": "text" },
      {
        "name": "to_defaultUnit",
        "type": "relation",
        "collectionId": units.id,
        "maxSelect": 1
      },
      ...AUTODATES
    ]
  })
  app.save(medications)

  const entries = new Collection({
    ...RULES,
    "type": "base",
    "name": "medicationEntries",
    "fields": [
      { "name": "date", "type": "date", "required": true },
      {
        "name": "to_medication",
        "type": "relation",
        "collectionId": medications.id,
        "maxSelect": 1,
        "required": true
      },
      { "name": "amount", "type": "text" },
      {
        "name": "to_amountUnit",
        "type": "relation",
        "collectionId": units.id,
        "maxSelect": 1
      },
      { "name": "comment", "type": "text" },
      ...AUTODATES
    ]
  })
  app.save(entries)

  for (const [code, name, nameDe] of UNITS) {
    try {
      app.findFirstRecordByData("amountUnitET", "code", code)
    } catch {
      const unit = new Record(units)
      unit.set("code", code)
      unit.set("name", name)
      unit.set("name_de", nameDe)
      app.save(unit)
    }
  }
}, (app) => {
  // The units stay: entries of meals may use them by now
  app.delete(app.findCollectionByNameOrId("medicationEntries"))
  app.delete(app.findCollectionByNameOrId("medications"))
})
