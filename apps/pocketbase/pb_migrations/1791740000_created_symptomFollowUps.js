/// <reference path="../pb_data/types.d.ts" />

// Follow-ups of a symptom entry: how the symptom was some time later, e.g.
// better after three hours but not gone. They are records of their own, so
// they do not count as new complaints in the month view and the report.
migrate((app) => {
  const entries = app.findCollectionByNameOrId("symptomEntries")

  const followUps = new Collection({
    // Open like the other collections: the server is only reachable at home
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "type": "base",
    "name": "symptomFollowUps",
    "fields": [
      { "name": "date", "type": "date", "required": true },
      {
        "name": "to_symptomEntry",
        "type": "relation",
        "collectionId": entries.id,
        "maxSelect": 1,
        "required": true,
        // A follow-up is nothing without its entry
        "cascadeDelete": true
      },
      {
        "name": "course",
        "type": "select",
        "values": ["better", "same", "worse", "gone"],
        "maxSelect": 1,
        "required": true
      },
      // 1-100 like the level of the entry; 0 stands for "not entered"
      { "name": "discomfortLevel", "type": "number" },
      { "name": "comment", "type": "text" },
      { "name": "created", "type": "autodate", "onCreate": true, "onUpdate": false },
      { "name": "updated", "type": "autodate", "onCreate": true, "onUpdate": true }
    ]
  })
  app.save(followUps)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("symptomFollowUps"))
})
