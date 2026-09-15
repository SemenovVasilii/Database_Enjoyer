const database = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE || 'commerce');

database.createUser({
  user: process.env.TEST_MONGO_USER || 'demo',
  pwd: process.env.TEST_MONGO_PASSWORD || 'demo_mongo',
  roles: [{ role: 'readWrite', db: database.getName() }],
});

database.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email'],
      properties: {
        email: { bsonType: 'string' },
        displayName: { bsonType: 'string' },
        createdAt: { bsonType: 'date' },
      },
    },
  },
});
database.users.createIndex({ email: 1 }, { unique: true });
database.users.insertMany([
  {
    _id: ObjectId('000000000000000000000001'),
    email: 'alice@example.test',
    displayName: 'Alice',
    createdAt: new Date(),
  },
  {
    _id: ObjectId('000000000000000000000002'),
    email: 'bob@example.test',
    displayName: 'Bob',
    createdAt: new Date(),
  },
]);

database.createCollection('products');
database.products.createIndex({ name: 1 });
database.products.insertMany([
  { name: 'Keyboard', price: NumberDecimal('99.90'), attributes: { color: 'green' }, active: true },
  { name: 'Mouse', price: NumberDecimal('39.50'), attributes: { wireless: true }, active: true },
]);

database.createCollection('orders');
database.orders.createIndex({ userId: 1, createdAt: -1 });
database.orders.insertMany([
  {
    userId: ObjectId('000000000000000000000001'),
    total: NumberDecimal('99.90'),
    status: 'paid',
    items: [{ name: 'Keyboard', quantity: 1 }],
    createdAt: new Date(),
  },
  {
    userId: ObjectId('000000000000000000000002'),
    total: NumberDecimal('39.50'),
    status: 'pending',
    createdAt: new Date(),
  },
]);
