# moongoose

Commands and scripts for interacting with MongoDB.

- `mongodb` MongoDB Node.js Driver
- `mongosh` MongoDB Shell

---

Commands to do the following:

- List databases,
- Create `test` database (default name,)
- Create `greetings` collection,
- With unique index on `label` field,
- Insert two documents,
- List indexes in `greetings` collection,
- Query the `greetings` collection with criteria that `label` field value is "myGreeting".

```
$ scripts/databases.sh
admin
local

$ node scripts/mongo.js greetings -u '{ "label": 1 }' -i '{"label": "myGreeting", "value": "Hello world."}'
{
  "insertedId": "68ff791e541fc65d69200fe5"
}
$ mongosh "$MONGODB_URI" --eval 'db.greetings.getIndexes()'
[
  { v: 2, key: { _id: 1 }, name: '_id_' },
  { v: 2, key: { label: 1 }, name: 'label_1', unique: true }
]

$ scripts/databases.sh
test
admin
local

$ scripts/collections.sh test
greetings

$ node scripts/mongo.js greetings -i '{"label": "bobsGreeting", "value": "Howdy stranger."}'
{
  "insertedId": "68ff792ddd675fdf221e6b69"
}

$ node scripts/mongo.js greetings -q '{ "label": "myGreeting" }'
[
  {
    "_id": "68ff791e541fc65d69200fe5",
    "label": "myGreeting",
    "value": "Hello world.",
    "created_at": "2025-10-27T13:52:30.094Z"
  }
]
```

> [!NOTE]  
> - `admin` database stores all user information.
>
> - `local` database stores data specific to a single mongod instance, including replication-related information.

```
$ scripts/collections.sh admin

$ scripts/collections.sh local
oplog.rs
```

> [!NOTE]  
> - system collections such as `system.users` and `system.roles` are hidden from ordinary database users and require privileges not granted to application connections.
>
> - `oplog.rs` holds a record of all data-modifying operations.

---

Interactive shell:

```
$ mongosh "$MONGODB_URI"
test> db.greetings.getIndexes()
[
  { v: 2, key: { _id: 1 }, name: '_id_' },
  { v: 2, key: { label: 1 }, name: 'label_1', unique: true }
]
```
