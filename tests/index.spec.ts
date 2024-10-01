import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { InferSchemaType } from "mongoose";

import { createMongooseFindWithinReferencePlugin } from "../src/index";

import { createExampleSchema } from "./schema";
import { createExampleData } from "./data";

describe("MongooseFindWithinReference", () => {
  let mongoServer: MongoMemoryServer;
  let mongoUri: string;

  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);

    for (const model in mongoose.connection.models) {
      delete mongoose.models[model];
    }
  });

  afterEach(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should be active using isActiveByDefault flag", async () => {
    const findWithinReferencePlugin = createMongooseFindWithinReferencePlugin({
      isActiveByDefault: true,
    });

    const { Agent, Publisher, Book, Author } = createExampleSchema(
      findWithinReferencePlugin
    );

    const data = await createExampleData({
      Agent,
      Publisher,
      Book,
      Author,
    });

    const authorsWithBestSeller = await Author.find({
      books: { isBestSeller: true, publisher: { name: "Publisher 2" } },
      agent: { name: "agent2" },
    }).populate<{
      agent: InferSchemaType<typeof Agent.schema>;
      books: (InferSchemaType<typeof Book.schema> & {
        publisher: InferSchemaType<typeof Publisher.schema>;
      })[];
    }>([
      {
        path: "books",
        populate: [
          {
            path: "publisher",
          },
        ],
      },
      { path: "agent" },
    ]);

    expect(authorsWithBestSeller).toHaveLength(1);
    expect(authorsWithBestSeller[0]._id).toEqual(data.author2._id);
    expect(authorsWithBestSeller[0].agent.name).toEqual("agent2");
    expect(
      authorsWithBestSeller[0].books.some(
        (book) => book.publisher.name === "Publisher 2"
      )
    ).toBe(true);
  });

  it("should work if subquery has no results", async () => {
    const findWithinReferencePlugin = createMongooseFindWithinReferencePlugin({
      isActiveByDefault: true,
    });

    const { Agent, Publisher, Book, Author } = createExampleSchema(
      findWithinReferencePlugin
    );

    await createExampleData({
      Agent,
      Publisher,
      Book,
      Author,
    });

    const authorsWithBestSeller = await Author.find({
      agent: { name: "smith" },
    });

    expect(authorsWithBestSeller).toHaveLength(0);
  });

  it("should query using dot syntax", async () => {
    const findWithinReferencePlugin = createMongooseFindWithinReferencePlugin({
      isActiveByDefault: true,
    });

    const { Agent, Publisher, Book, Author } = createExampleSchema(
      findWithinReferencePlugin
    );

    const data = await createExampleData({
      Agent,
      Publisher,
      Book,
      Author,
    });

    const authors = await Author.find({
      books: {
        isBestSeller: true,
        "publisher.name": "Publisher 2",
      },
      "agent.name": "agent2",
    }).populate<{
      agent: InferSchemaType<typeof Agent.schema>;
      books: (InferSchemaType<typeof Book.schema> & {
        publisher: InferSchemaType<typeof Publisher.schema>;
      })[];
    }>([
      {
        path: "agent",
      },
      {
        path: "books",
        populate: [
          {
            path: "publisher",
          },
        ],
      },
    ]);

    expect(authors).toHaveLength(1);
    expect(authors[0]._id).toEqual(data.author2._id);
    expect(authors[0].agent.name).toEqual("agent2");
    expect(authors[0].books.length).toEqual(2);
    expect(
      authors[0].books.some((book) => book.publisher.name === "Publisher 2")
    );
  });

  it("should work using per-query flag", async () => {
    await mongoose.connect(mongoUri);

    const findWithinReferencePlugin = createMongooseFindWithinReferencePlugin({
      isActiveByDefault: false,
    });

    const { Agent, Publisher, Book, Author } = createExampleSchema(
      findWithinReferencePlugin
    );

    const data = await createExampleData({
      Agent,
      Publisher,
      Book,
      Author,
    });

    const authors = await Author.find(
      {
        books: { isBestSeller: true, publisher: { name: "Publisher 2" } },
        agent: { name: "agent2" },
      },
      undefined,
      {
        useFindWithinReference: true,
      }
    ).populate<{
      agent: InferSchemaType<typeof Agent.schema>;
      books: (InferSchemaType<typeof Book.schema> & {
        publisher: InferSchemaType<typeof Publisher.schema>;
      })[];
    }>([
      {
        path: "books",
        populate: [
          {
            path: "publisher",
          },
        ],
      },
      {
        path: "agent",
      },
    ]);

    expect(authors).toHaveLength(1);
    expect(authors[0]._id).toEqual(data.author2._id);
    expect(authors[0].agent.name).toEqual("agent2");
    expect(
      authors[0].books.some((book) => book.publisher.name === "Publisher 2")
    );
  });

  it("should not work without global or per-query option", async () => {
    await mongoose.connect(mongoUri);

    const findWithinReferencePlugin = createMongooseFindWithinReferencePlugin({
      isActiveByDefault: false,
    });

    const { Agent, Publisher, Book, Author } = createExampleSchema(
      findWithinReferencePlugin
    );

    await createExampleData({
      Agent,
      Publisher,
      Book,
      Author,
    });

    await expect(() =>
      Author.find({
        books: { isBestSeller: true, publisher: { name: "Publisher 2" } },
        agent: { name: "agent2" },
      })
    ).rejects.toThrow(
      `Cast to ObjectId failed for value "{ name: 'agent2' }" (type Object) at path "agent" for model "Author"`
    );
  });

  it("should return books by female or diverse publishers", async () => {
    await mongoose.connect(mongoUri);

    const findWithinReferencePlugin = createMongooseFindWithinReferencePlugin({
      isActiveByDefault: true,
    });

    const { Agent, Publisher, Book, Author } = createExampleSchema(
      findWithinReferencePlugin
    );

    const data = await createExampleData({
      Agent,
      Publisher,
      Book,
      Author,
    });

    const result = await Book.find({
      $or: [
        {
          "publisher.gender": "w",
        },
        {
          "publisher.gender": "d",
        },
      ],
    }).populate<{
      publisher: InferSchemaType<typeof Publisher.schema>;
    }>([
      {
        path: "publisher",
      },
    ]);

    expect(result).toHaveLength(3);
    expect(
      result.every((book) => ["w", "d"].includes(book.publisher.gender))
    ).toBe(true);
  });

  it("should return authors of book1 or book2", async () => {
    await mongoose.connect(mongoUri);

    const findWithinReferencePlugin = createMongooseFindWithinReferencePlugin({
      isActiveByDefault: true,
    });

    const { Agent, Publisher, Book, Author } = createExampleSchema(
      findWithinReferencePlugin
    );

    const data = await createExampleData({
      Agent,
      Publisher,
      Book,
      Author,
    });

    const result = await Author.find({
      $or: [{ books: { title: "book1" } }, { books: { title: "book3" } }],
    }).populate<{
      books: InferSchemaType<typeof Book.schema>[];
    }>([{ path: "books" }]);

    expect(result).toHaveLength(2);
    expect(result[0]._id).toEqual(data.author1._id);
    expect(result[1]._id).toEqual(data.author2._id);
    expect(result[0].books.some((book) => book.title === "book1")).toBe(true);
    expect(result[1].books.some((book) => book.title === "book3")).toBe(true);
  });
});
