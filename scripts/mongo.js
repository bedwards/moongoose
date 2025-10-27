import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: ".env", quiet: true });

// database defaults to "test" if not found in MONGODB_URL or MONGODB_DBNAME
const MONGODB_URL = process.env.MONGODB_URL
const MONGODB_DBNAME = process.env.MONGODB_DBNAME

const help = `Usage: node run-mongo.js [options] [collection] [query] [projection]

Find documents:
  node run-mongo.js users                                    # Find all users
  node run-mongo.js users '{"age": {"$gt": 25}}'            # Find with query
  node run-mongo.js users '{}' '{"name": 1, "email": 1}'    # With projection

Insert document:
  node run-mongo.js --insert '{"name": "Alice"}'            # Requires --collection
  node run-mongo.js -i '{"name": "Alice"}' -c users         # Short form

Options:
  -c, --collection <name>     Collection name (required)
  -q, --query <json>          Query filter (default: '{}')
  -p, --project <json>        Projection (default: '{}')
  -s, --sort <json>           Sort order (default: undefined)
  -l, --limit <number>        Limit results (default: 50)
  -i, --insert <json>         Insert document (incompatible with query options)
  -u, --index <json>          Create unique index
  -h, --help                  Show this help message

Examples:
  # Find with flags
  node run-mongo.js -c users -q '{"age": {"$gt": 25}}' -l 10

  # Sort and project
  node run-mongo.js users '{}' '{"_id": 0}' --sort '{"age": -1}' --limit 5

  # Insert (requires collection)
  node run-mongo.js --collection users --insert '{"name": "Bob", "age": 30}'
`

const argv = process.argv.slice(2);
const flags = {};
const positionals = [];

const aliases = {
    c: "collection",
    q: "query",
    p: "project",
    s: "sort",
    l: "limit",
    i: "insert",
    u: "index",
    h: "help",
};

for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith("--") || arg.startsWith("-")) {
        const [key, ...valueParts] = arg.split("=");
        const cleanKey = key.replace(/^--?/, "");

        if (valueParts.length > 0) {
            flags[cleanKey] = valueParts.join("=");
        } else if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
            // Format: --key=value or -k=value
            // Format: --key value or -k value
            flags[cleanKey] = argv[i + 1];
            i++;
        } else {
            flags[cleanKey] = "true";
        }
    } else {
        positionals.push(arg);
    }
}

for (const [short, long] of Object.entries(aliases)) {
    if (flags[short] !== undefined) {
        flags[long] = flags[short];
        delete flags[short];
    }
}

if (flags.help) {
    console.log(help);
    process.exit(0);
}

const collection = flags.collection || positionals[0];

if (!collection) {
    console.error("Error: Collection name is required");
    console.error("Usage: node run-mongo.js [options] <collection> [query] [projection]");
    console.error("Run with --help for more information");
    process.exit(1);
}

const isInsert = flags.insert !== undefined;

if (isInsert) {
    const incompatibleFlags = ["query", "project", "sort", "limit"].filter(f => flags[f] !== undefined);
    if (incompatibleFlags.length > 0) {
        console.error(`Error: --insert cannot be used with: ${incompatibleFlags.map(f => `--${f}`).join(", ")}`);
        console.error("Insert operations don't support query, projection, sort, or limit");
        process.exit(1);
    }

    if (positionals.length > 1) {
        console.error("Error: --insert cannot be used with positional query/projection arguments");
        console.error("Use: node run-mongo.js --insert '<json>' --collection <name>");
        process.exit(1);
    }
}

let query = "{}";
let projection = "{}";
let sort = undefined;
let limit = 50;

if (!isInsert) {
    query = flags.query || positionals[1] || "{}";
    projection = flags.project || positionals[2] || "{}";

    if (flags.sort) {
        sort = flags.sort;
    }

    if (flags.limit) {
        limit = Number(flags.limit);

        if (isNaN(limit) || limit < 1) {
            console.error(`Error: --limit must be a positive number, got: ${flags.limit}`);
            process.exit(1);
        }
    }
}

const client = new MongoClient(MONGODB_URL);
await client.connect();

try {
    const db = client.db(MONGODB_DBNAME);
    const col = db.collection(collection);

    if (isInsert) {
        let doc;
        try {
            doc = JSON.parse(flags.insert);
        } catch (err) {
            console.error(`Error: Invalid JSON for --insert: ${err.message}`);
            process.exit(1);
        }

        const result = await col.insertOne({
            ...doc,
            created_at: doc.created_at ?? new Date().toISOString(),
        });
        console.log(JSON.stringify({ insertedId: result.insertedId }, null, 2));

        if (flags.index) {
            const indexSpec = JSON.parse(flags.index);
            await col.createIndex(indexSpec, { unique: true });
        }

    } else {
        let queryObj, projectionObj, sortObj;

        try {
            queryObj = JSON.parse(query);

        } catch (err) {
            console.error(`Error: Invalid JSON for query: ${err.message}`);
            process.exit(1);
        }

        try {
            projectionObj = JSON.parse(projection);

        } catch (err) {
            console.error(`Error: Invalid JSON for projection: ${err.message}`);
            process.exit(1);
        }

        if (sort) {
            try {
                sortObj = JSON.parse(sort);

            } catch (err) {
                console.error(`Error: Invalid JSON for sort: ${err.message}`);
                process.exit(1);
            }
        }

        const cursor = (
            col.find(
                queryObj,
                {
                    projection: projectionObj,
                    ...(sortObj && { sort: sortObj })
                }
            )
                .limit(limit)
        );

        const docs = await cursor.toArray();
        console.log(JSON.stringify(docs, null, 2));
    }

} catch (e) {
    console.error(e.message);

} finally {
    await client.close();
}
