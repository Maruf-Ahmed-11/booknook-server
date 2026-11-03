import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 8000;


const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("Successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}

app.use(cors());
app.use(express.json());

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("booknook");
const booksCollection = db.collection("books");
const borrowsCollection = db.collection("borrows");

// ==========================================
// BOOKS API ROUTES
// ==========================================

// 1. Add a new book
app.post("/books", async (req, res) => {
    const data = req.body;
    const result = await booksCollection.insertOne(data);
    res.send(result);
});

// 2. Get all books (Public)
app.get('/books', async (req, res) => {
    const result = await booksCollection.find().toArray();
    res.send(result);
});

// 3. Get a single book by ID
app.get('/books/:id', async (req, res) => {
    const { id } = req.params;
    const result = await booksCollection.findOne({ _id: new ObjectId(id) });
    res.send(result);
});

// 4. Update a book
app.patch('/books/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;

    // Remove _id from data if it exists so MongoDB doesn't throw an error when updating
    delete data._id;

    const result = await booksCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: data }
    );
    res.json(result);
});

// 5. Delete a book
app.delete('/books/:id', async (req, res) => {
    const { id } = req.params;
    const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
    res.json(result);
});

app.get('/', (req, res) => {
    res.send({ message: 'BookNook Server is running fine!' });
});

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
});