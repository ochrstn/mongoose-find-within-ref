import {
  FilterQuery,
  Model,
  MongooseDefaultQueryMiddleware,
  Schema,
  isObjectIdOrHexString,
} from "mongoose";

export interface MongooseFindWithinReferenceOptions {
  isActiveByDefault?: boolean;
  middlewares?: MongooseDefaultQueryMiddleware[];
}

function shouldWeHandleThis(value: any) {
  return (
    value &&
    !isObjectIdOrHexString(value) &&
    !value["$in"] &&
    !value["$nin"] &&
    !value["$exists"]
  );
}

const defaultMiddlewares: MongooseDefaultQueryMiddleware[] = [
  "find",
  "findOne",
  "distinct",
  "count",
  "countDocuments",
] as MongooseDefaultQueryMiddleware[];

async function handleQueryKey(
  query: FilterQuery<any>,
  key: string,
  schema: Schema,
  models: Readonly<{
    [index: string]: Model<any, {}, {}, {}, any, any>;
  }>
) {
  const value = query[key];

  // value is in dot syntax
  const isDotSyntax: boolean = key.includes(".");

  // if the key is in dot syntax, 1. get the first part of the key
  const firstPartOfKey = isDotSyntax ? key.split(".")[0] : key;

  // if the key is in dot syntax, get the remaining part of the key
  const remainingPartOfKey = isDotSyntax
    ? key.split(".").slice(1).join(".")
    : "";

  // get the datatype of the field from the mongoose schema
  const fieldSchema = schema.path(firstPartOfKey);

  // if the field exists in the schema
  if (fieldSchema) {
    // check if is array
    if (fieldSchema.instance === "Array") {
      // get the reference model name from the schema
      const ref = fieldSchema.options.type[0].ref;
      if (ref) {
        // check if we should handle this query (query operation is something that justifies a subquery)
        if (shouldWeHandleThis(value)) {
          // replace the inner query with the ids of the referenced documents, obtained through a subquery
          if (isDotSyntax) {
            delete query[key];
          }
          query[isDotSyntax ? firstPartOfKey : key] = {
            $in: (
              await models[ref].find(
                isDotSyntax ? { [remainingPartOfKey]: value } : value,
                { _id: 1 },
                { useFindWithinReference: true }
              )
            ).map((doc) => doc._id),
          };
        }
      }
    } else {
      // field is not an array
      const value = query[key];
      // get the reference model name from the schema
      const ref = fieldSchema.options.ref;
      if (ref) {
        // check if we should handle this query (query operation is something that justifies a subquery)
        if (shouldWeHandleThis(value)) {
          if (isDotSyntax) {
            delete query[key];
          }

          const foundDocument = await models[ref].findOne(
            isDotSyntax ? { [remainingPartOfKey]: value } : value,
            { _id: 1 },
            { useFindWithinReference: true }
          );

          if (foundDocument) {
            query[isDotSyntax ? firstPartOfKey : key] = foundDocument._id;
          } else {
            // rewrite the query so that it does not match anything
            query[isDotSyntax ? firstPartOfKey : key] = { $in: [] };
          }
        }
      }
    }
  }
}

export function createMongooseFindWithinReferencePlugin(
  pluginOptions: MongooseFindWithinReferenceOptions
) {
  return function MongooseFindWithinReference(schema: Schema) {
    schema.pre(
      pluginOptions?.middlewares || defaultMiddlewares,
      async function (next) {
        const options = this.getOptions();

        const isActiveByDefault = pluginOptions.isActiveByDefault;
        const isActiveForQuery = options && options.useFindWithinReference;

        // opt-in: if the option is not set, just continue
        if (!isActiveByDefault && !isActiveForQuery) {
          next();
          return;
        }

        const models = this.model.db.models;
        const query = this.getQuery();

        // for every key in the query
        for (const key of Object.keys(query)) {
          if (key === "$or") {
            for (let i = 0; i < (query[key] || []).length; i++) {
              for (const ckey of Object.keys((query[key] || [])[i])) {
                await handleQueryKey(
                  (query[key] || [])[i],
                  ckey as unknown as string,
                  schema,
                  models
                );
              }
            }
          }

          await handleQueryKey(query, key, schema, models);
        }

        this.where(query);

        next();
      }
    );
  };
}
