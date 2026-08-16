/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2048467483")

  // update collection data
  unmarshal({
    "name": "symptomTypeET"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2048467483")

  // update collection data
  unmarshal({
    "name": "symptomType"
  }, collection)

  return app.save(collection)
})
