/// <reference path="../pb_data/types.d.ts" />

// A food gets the amount it is usually eaten in, e.g. 1 piece or 200 ml. It
// is suggested when the food is logged, like the usual dose of a medication.
migrate((app) => {
  const units = app.findCollectionByNameOrId("amountUnitET")
  const foods = app.findCollectionByNameOrId("foodItems")

  foods.fields.add(new Field({ "name": "defaultAmount", "type": "text" }))
  foods.fields.add(new Field({
    "name": "to_defaultUnit",
    "type": "relation",
    "collectionId": units.id,
    "maxSelect": 1
  }))
  app.save(foods)
}, (app) => {
  const foods = app.findCollectionByNameOrId("foodItems")
  foods.fields.removeByName("defaultAmount")
  foods.fields.removeByName("to_defaultUnit")
  app.save(foods)
})
