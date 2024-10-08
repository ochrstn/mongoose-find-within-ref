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
  let firstPartOfKey = isDotSyntax ? key.split(".")[0] : key;

  // if the key is in dot syntax, get the remaining part of the key
  const remainingPartOfKey = isDotSyntax
    ? key.split(".").slice(1).join(".")
    : "";

  // get the datatype of the field from the mongoose schema
  const fieldSchema = schema.path(firstPartOfKey);

  // if the field exists in the schema
  if (fieldSchema) {
    let ref = null;

    // check if is array
    if (fieldSchema.instance === "Array") {
      // get the reference model name from the schema
      ref = fieldSchema.options.type[0].ref;
    } else {
      // get the reference model name from the schema
      ref = fieldSchema.options.ref;
    }

    if (ref && shouldWeHandleThis(value)) {
      if (isDotSyntax) {
        delete query[key];
      }

      const innerResult = (
        await models[ref].find(
          isDotSyntax ? { [remainingPartOfKey]: value } : value,
          { _id: 1 },
          { useFindWithinReference: true }
        )
      ).map((doc) => doc._id);
      query[firstPartOfKey] = {
        $in: innerResult,
      };
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
