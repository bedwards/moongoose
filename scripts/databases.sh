#!/bin/sh

set -eu

source .env

mongosh "$MONGODB_URL" --eval \
    "db.adminCommand({listDatabases:1, nameOnly:true}).databases.forEach(d => print(d.name))"
