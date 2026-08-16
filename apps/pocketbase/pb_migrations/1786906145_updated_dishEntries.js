/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3816835489")

  // update field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3455836199",
    "help": "",
    "hidden": false,
    "id": "relation2759424004",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "to_amountUnit",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // update field
  collection.fields.addAt(5, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2938174080",
    "help": "",
    "hidden": false,
    "id": "relation86340455",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "to_foodItem",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // update field
  collection.fields.addAt(6, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1868475923",
    "help": "",
    "hidden": false,
    "id": "relation2508033208",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "to_dish",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3816835489")

  // update field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3455836199",
    "help": "",
    "hidden": false,
    "id": "relation2759424004",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "amountUnit",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // update field
  collection.fields.addAt(5, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2938174080",
    "help": "",
    "hidden": false,
    "id": "relation86340455",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "foodItem",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // update field
  collection.fields.addAt(6, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1868475923",
    "help": "",
    "hidden": false,
    "id": "relation2508033208",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "dish",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
