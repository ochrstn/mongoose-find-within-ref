import mongoose from "mongoose";

export function createExampleSchema(plugin: any) {
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

  bookSchema.plugin(plugin);

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

  authorSchema.plugin(plugin);

  const Author = mongoose.model("Author", authorSchema);

  return { Agent, Publisher, Book, Author };
}
