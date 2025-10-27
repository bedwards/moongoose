#!/bin/sh

set -eu

source .env

mongosh "$MONGODB_URL" --eval \
  "db.getSiblingDB('$1').runCommand({ listCollections: 1, nameOnly: true }).cursor.firstBatch.forEach(c => print(c.name))"
