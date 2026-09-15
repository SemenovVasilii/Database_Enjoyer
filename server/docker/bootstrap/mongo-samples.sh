#!/bin/sh
set -eu
count=$(mongosh --quiet --host 127.0.0.1 -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval 'db.getSiblingDB("restaurants").getCollectionNames().includes("restaurants") ? print(1) : print(0)')
if [ "$count" = 0 ]; then
  mongoimport --host 127.0.0.1 -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db restaurants --collection restaurants --file /samples/mongodb/restaurants.jsonl
else
  echo 'restaurants collection exists; keeping its documents.'
fi
mongosh --quiet --host 127.0.0.1 -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin /samples/mongodb/setup.js
