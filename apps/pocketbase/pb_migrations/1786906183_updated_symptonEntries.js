/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3553648526")

  // update field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2373121546",
    "help": "",
    "hidden": false,
    "id": "relation3837980832",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "to_symptom",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3553648526")

  // update field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2373121546",
    "help": "",
    "hidden": false,
    "id": "relation3837980832",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "symptom",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
