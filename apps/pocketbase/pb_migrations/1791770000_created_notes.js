/// <reference path="../pb_data/types.d.ts" />

// Notes on a day, e.g. why one felt bad or why nothing was logged
migrate((app) => {
  const notes = new Collection({
    // Open like the other collections: the server is only reachable at home
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "type": "base",
    "name": "notes",
    "fields": [
      { "name": "date", "type": "date", "required": true },
      { "name": "text", "type": "text", "required": true },
      { "name": "created", "type": "autodate", "onCreate": true, "onUpdate": false },
      { "name": "updated", "type": "autodate", "onCreate": true, "onUpdate": true }
    ]
  })
  app.save(notes)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("notes"))
})
