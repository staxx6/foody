/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2938174080")

  // update collection data
  unmarshal({
    "name": "foodtems"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2938174080")

  // update collection data
  unmarshal({
    "name": "footItems"
  }, collection)

  return app.save(collection)
})
