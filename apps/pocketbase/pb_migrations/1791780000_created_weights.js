/// <reference path="../pb_data/types.d.ts" />

// The body weight at a moment, in kilograms
migrate((app) => {
  const weights = new Collection({
    // Open like the other collections: the server is only reachable at home
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "type": "base",
    "name": "weights",
    "fields": [
      { "name": "date", "type": "date", "required": true },
      { "name": "kilograms", "type": "number", "required": true, "min": 0 },
      { "name": "created", "type": "autodate", "onCreate": true, "onUpdate": false },
      { "name": "updated", "type": "autodate", "onCreate": true, "onUpdate": true }
    ]
  })
  app.save(weights)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("weights"))
})
