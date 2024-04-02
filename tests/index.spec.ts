import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

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

  describe(`query for authors who have a best seller with publisher "Publisher 2" and agent "agent2"`, () => {
    it("should work using isActiveByDefault flag", async () => {
      const findWithinReferencePlugin = createMongooseFindWithinReferencePlugin(
        {
          isActiveByDefault: true,
        }
      );

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
      });

      expect(authorsWithBestSeller).toHaveLength(1);
      expect(authorsWithBestSeller[0]._id).toEqual(data.author2._id);
    });

    it("should work using per-query flag", async () => {
      await mongoose.connect(mongoUri);

      const findWithinReferencePlugin = createMongooseFindWithinReferencePlugin(
        {
          isActiveByDefault: false,
        }
      );

      const { Agent, Publisher, Book, Author } = createExampleSchema(
        findWithinReferencePlugin
      );

      const data = await createExampleData({
        Agent,
        Publisher,
        Book,
        Author,
      });

      const authorsWithBestSeller = await Author.find(
        {
          books: { isBestSeller: true, publisher: { name: "Publisher 2" } },
          agent: { name: "agent2" },
        },
        undefined,
        {
          useFindWithinReference: true,
        }
      );

      expect(authorsWithBestSeller).toHaveLength(1);
      expect(authorsWithBestSeller[0]._id).toEqual(data.author2._id);
    });

    it("should not work without global or per-query option", async () => {
      await mongoose.connect(mongoUri);

      const findWithinReferencePlugin = createMongooseFindWithinReferencePlugin(
        {
          isActiveByDefault: false,
        }
      );

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
  });

  describe(`query with top-level $or operator`, () => {
    it("should return the authors who have written book1 or book2", async () => {
      await mongoose.connect(mongoUri);

      const findWithinReferencePlugin = createMongooseFindWithinReferencePlugin(
        {
          isActiveByDefault: true,
        }
      );

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
      });

      expect(result).toHaveLength(2);

      expect(result[0]._id).toEqual(data.author1._id);
      expect(result[1]._id).toEqual(data.author2._id);
    });
  });
});
