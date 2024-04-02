import { Model } from "mongoose";

export async function createExampleData({
  Agent,
  Publisher,
  Book,
  Author,
}: {
  Agent: Model<any>;
  Publisher: Model<any>;
  Book: Model<any>;
  Author: Model<any>;
}) {
  const publisher1 = await new Publisher({
    name: "Publisher 1",
  }).save();
  const publisher2 = await new Publisher({
    name: "Publisher 2",
  }).save();
  const publisher3 = await new Publisher({
    name: "Publisher 3",
  }).save();

  const book1 = await new Book({
    title: "book1",
    isBestSeller: true,
    publisher: publisher1,
  }).save();
  const book2 = await new Book({
    title: "book2",
    isBestSeller: false,
    publisher: publisher2,
  }).save();
  const book3 = await new Book({
    title: "book3",
    isBestSeller: false,
    publisher: publisher3,
  }).save();
  const book4 = await new Book({
    title: "book4",
    isBestSeller: true,
    publisher: publisher2,
  }).save();

  const agent1 = await new Agent({ name: "agent1" }).save();
  const agent2 = await new Agent({ name: "agent2" }).save();

  const author1 = await new Author({
    name: "author1",
    agent: agent1,
    books: [book1, book2],
  }).save();

  const author2 = await new Author({
    name: "author2",
    agent: agent2,
    books: [book3, book4],
  }).save();

  const author3 = await new Author({
    name: "author3",
    agent: agent1,
    books: [],
  }).save();

  return {
    publisher1,
    publisher2,
    publisher3,
    book1,
    book2,
    book3,
    book4,
    agent1,
    agent2,
    author1,
    author2,
    author3,
  };
}
