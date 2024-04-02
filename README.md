# Mongoose Find Within Reference

This is a Mongoose plugin that allows you to perform nested queries within referenced documents in your MongoDB database. It's particularly useful when you want to find documents based on the properties of their referenced documents.

## Installation

You can install this package using npm:

```sh
npm install mongoose-find-within-ref
```

## Usage

First, import the plugin:

```typescript
import { createMongooseFindWithinReferencePlugin } from "mongoose-find-within-ref";
```

Then, create an instance of the plugin and pass it to your Mongoose schema's `plugin` method:

```typescript
// 1. create an instance of the plugin
const findWithinReferencePlugin = createMongooseFindWithinReferencePlugin({
  isActiveByDefault: true,
});

const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
});

const Agent = mongoose.model("Agent", agentSchema);

const publisherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
});

const Publisher = mongoose.model("Publisher", publisherSchema);

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  isBestSeller: {
    type: Boolean,
    required: true,
  },
  publisher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Publisher",
    required: true,
  },
});

// 2. pass the plugin to the schema's plugin method
bookSchema.plugin(findWithinReferencePlugin);

const Book = mongoose.model("Book", bookSchema);

const authorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agent",
    required: true,
  },
  books: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
    },
  ],
});

// 2. pass the plugin to the schema's plugin method
authorSchema.plugin(findWithinReferencePlugin);

const Author = mongoose.model("Author", authorSchema);
```

You can now perform nested queries within referenced documents. For example, you can find all authors who have a best seller with a specific publisher and agent:

```typescript
Author.find({
  // books is an array of references and part of the Author document
  books: {
    // isBestSeller is a property of the referenced Book document
    isBestSeller: true,
    // the publishers name field is a property of the referenced Publisher document inside the referenced book document
    publisher: { name: "Publisher 2" },
  },
  agent: { name: "agent2" }, // the agents name field is a property of the referenced Agent document inside the Author document
});
```

### Options

The [`createMongooseFindWithinReferencePlugin`](command:_github.copilot.openSymbolInFile?%5B%22src%2Findex.ts%22%2C%22createMongooseFindWithinReferencePlugin%22%5D "src/index.ts") function accepts an options object with the following properties:

- [`isActiveByDefault`](command:_github.copilot.openSymbolInFile?%5B%22src%2Findex.ts%22%2C%22isActiveByDefault%22%5D "src/index.ts"): A boolean that determines whether the plugin is active by default for all queries. If set to `false`, you can still activate the plugin for individual queries by setting the [`useFindWithinReference`](command:_github.copilot.openSymbolInFile?%5B%22src%2Findex.ts%22%2C%22useFindWithinReference%22%5D "src/index.ts") option to `true` in the query options.

- [`middlewares`] By default the plugin will use the `pre` middleware to intercept the `find`, `findOne`, `distinct`, `count` and `countDocumets` methods. If you want to use a different middlewares, you can pass them as an array of strings (see [Mongoose middleware](https://mongoosejs.com/docs/middleware.html)).

## How It Works

The plugin works by intercepting the `find` and `findOne` methods of your Mongoose models. When you perform a query, the plugin checks if the query includes any reference fields. If it does, the plugin modifies the query to perform a nested query within the referenced documents.

Here's a step-by-step breakdown of how it works:

1. **Interception**: When you call `find` or `findOne`, the plugin intercepts the call and inspects the query.

2. **Identification**: The plugin identifies any reference fields in the query. It does this by comparing the query fields with the reference fields defined in your Mongoose schema.

3. **Modification**: If the plugin finds any reference fields in the query, it modifies the query to perform a nested query within the referenced documents. This involves replacing the reference field in the query with an `_id` field that matches the IDs of the referenced documents that satisfy the nested query.

4. **Execution**: Finally, the plugin executes the modified query and returns the results.

Please note that this is a simplified explanation. The actual process involves more steps and checks to handle various edge cases and ensure optimal performance. If you're interested in the details, you can check out the source code on our GitHub repository.

## Caveats

While the plugin is a powerful tool for querying nested documents, there are some limitations to be aware of:

If the reference field you want to query is nested within another operator in your query, it will not be considered in every case. Currently only a top-level `$or` operator can be handled. This is a known limitation and we're actively working on a solution. For now, you'll need to structure your queries so that the reference fields are not nested within other operators.

Using the dot notation to query nested fields in referenced documents is currently not supported. For example, you cannot query a nested field like `book.publisher.name` directly. Instead, you need to query the nested field as a nested object like in the example above`.

## Contributing

We're always looking to improve, so if you encounter any issues or have suggestions for improvements, please feel free to open an issue or merge request.

### Testing

This package uses Jest for testing. You can run the tests with the following command:

```sh
npm test
```

### Building

You can build the package with the following command:

```sh
npm run build
```

## License

This package is licensed under the MIT License. See the [`LICENSE`](command:_github.copilot.openRelativePath?%5B%22LICENSE%22%5D "LICENSE") file for more details.
