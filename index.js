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

// --- API Routes will go here ---

app.get('/', (req, res) => {
    res.send({ message: 'BookNook Server is running fine!' });
});

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
});