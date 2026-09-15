// Local schema/index annotations added to the official MongoDB tutorial dataset.
const sample = db.getSiblingDB('restaurants');
const username = process.env.SAMPLE_MONGO_USER || 'enjoyer';
if (!sample.getUser(username))
  sample.createUser({
    user: username,
    pwd: process.env.SAMPLE_MONGO_PASSWORD || 'enjoyer_mongo',
    roles: [{ role: 'read', db: 'restaurants' }],
  });
sample.runCommand({
  collMod: 'restaurants',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'borough', 'cuisine'],
      properties: {
        name: { bsonType: 'string' },
        borough: { bsonType: 'string' },
        cuisine: { bsonType: 'string' },
        address: { bsonType: 'object' },
        grades: { bsonType: 'array' },
      },
    },
  },
  validationLevel: 'moderate',
});
sample.restaurants.createIndex({ borough: 1, cuisine: 1 }, { name: 'borough_cuisine' });
sample.restaurants.createIndex({ restaurant_id: 1 }, { name: 'restaurant_id' });
sample.restaurants.createIndex({ 'address.coord': '2dsphere' }, { name: 'address_geo' });
