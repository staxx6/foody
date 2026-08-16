/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2373121546")

  // add field
  collection.fields.addAt(3, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2048467483",
    "help": "",
    "hidden": false,
    "id": "relation2363381545",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "type",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1055409929",
    "help": "",
    "hidden": false,
    "id": "relation400968378",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "locations",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2373121546")

  // remove field
  collection.fields.removeById("relation2363381545")

  // remove field
  collection.fields.removeById("relation400968378")

  return app.save(collection)
})
