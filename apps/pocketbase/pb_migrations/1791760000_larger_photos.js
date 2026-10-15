/// <reference path="../pb_data/types.d.ts" />

// A photo taken by a phone is often larger than the 5 MB a file may have by
// default. The server rejected such a record, which also kept back all that
// was queued behind it on that device. The app shrinks new photos; this lets
// through what is already queued.
const PHOTOS = {
  foodItems: "images",
  dishes: "images",
  medications: "images",
  symptomLocationET: "image",
}

function setMaxSize(app, maxSize) {
  for (const [name, fieldName] of Object.entries(PHOTOS)) {
    const collection = app.findCollectionByNameOrId(name)
    const field = collection.fields.getByName(fieldName)
    if (!field) continue
    field.maxSize = maxSize
    app.save(collection)
  }
}

migrate((app) => {
  setMaxSize(app, 30 * 1024 * 1024)
}, (app) => {
  // 0 stands for the default
  setMaxSize(app, 0)
})
