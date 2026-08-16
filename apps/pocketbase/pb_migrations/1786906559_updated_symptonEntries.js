/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3553648526")

  // update collection data
  unmarshal({
    "name": "symptomEntries"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3553648526")

  // update collection data
  unmarshal({
    "name": "symptonEntries"
  }, collection)

  return app.save(collection)
})
