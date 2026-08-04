/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3146854971")

  // add field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_2938174080",
    "help": "",
    "hidden": false,
    "id": "relation3363630537",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "to_foodItem",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // update field
  collection.fields.addAt(3, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3455836199",
    "help": "",
    "hidden": false,
    "id": "relation2759424004",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "to_amountUnit",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3146854971")

  // remove field
  collection.fields.removeById("relation3363630537")

  // update field
  collection.fields.addAt(3, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3455836199",
    "help": "",
    "hidden": false,
    "id": "relation2759424004",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "amountUnit",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
