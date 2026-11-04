import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
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


app.use(cors({
    origin: [
        'http://localhost:3000',
        // have to add deployed Vercel URL here later
    ],
    credentials: true
}));

app.use(express.json());

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("booknook");
const booksCollection = db.collection("books");
const borrowsCollection = db.collection("borrows");


const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized access: Invalid token' });
        }
        req.user = decoded;
        next();
    });
};


// ===================================
// AUTHENTICATION API (JWT Generation)
// ===================================
app.post('/jwt', async (req, res) => {
    const user = req.body;
    // Create a token containing the user's email, signed with your secret, valid for 1 day
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.send({ token });
});


// ==================
// BOOKS API ROUTES
// ==================

// 1. Add a new book(Secured)
app.post("/books", verifyToken, async (req, res) => {
    const data = req.body;
    const result = await booksCollection.insertOne(data);
    res.send(result);
});

// 2. Get all books (Public)
app.get('/books', async (req, res) => {
    let query = {};
    if (req.query.email) { query.userEmail = req.query.email; }
    let cursor = booksCollection.find(query);
    if (req.query.sort === 'newest' || req.query.sort === '-1') { cursor = cursor.sort({ _id: -1 }); }
    if (req.query.limit) { cursor = cursor.limit(parseInt(req.query.limit)); }
    const result = await cursor.toArray();
    res.send(result);
});

app.get('/latest-books', async (req, res) => {
    const result = await booksCollection.find().sort({ _id: -1 }).limit(6).toArray();
    res.send(result);
});

// 3. Get a single book by ID(Public)
app.get("/books/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await booksCollection.findOne(query);
    res.send(result);
});

// 4. Update a book
app.patch('/books/:id', verifyToken, async (req, res) => {
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
app.delete('/books/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
    res.json(result);
});

// ===================
// BORROWS API ROUTES
// ===================

// 6. Borrow a book
app.post('/borrows', verifyToken, async (req, res) => {
    const borrowData = req.body;

    //Preventing Double Borrowing
    const query = { userEmail: borrowData.userEmail, bookId: borrowData.bookId };
    const alreadyBorrowed = await borrowsCollection.findOne(query);

    if (alreadyBorrowed) {
        return res.status(400).send({ message: 'You have already borrowed this book!' });
    }

    // Save the borrow record
    const result = await borrowsCollection.insertOne(borrowData);

    // Decreaseing available copies by 1 using $inc
    await booksCollection.updateOne(
        { _id: new ObjectId(borrowData.bookId) },
        { $inc: { copies: -1 } }
    );

    res.send(result);
});

// 7. Get borrows for a specific user
app.get('/borrows', verifyToken, async (req, res) => {
    const email = req.query.email;
    const result = await borrowsCollection.find({ userEmail: email }).toArray();
    res.send(result);
});

// 8. Return a book (Delete borrow record & increase copies)
app.delete('/borrows/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { bookId } = req.body; // Frontend will send this to know which book to update

    // Delete the borrow record
    const result = await borrowsCollection.deleteOne({ _id: new ObjectId(id) });

    // Increase available copies by 1 using $inc
    if (bookId) {
        await booksCollection.updateOne(
            { _id: new ObjectId(bookId) },
            { $inc: { copies: 1 } }
        );
    }

    res.json(result);
});

app.get('/', (req, res) => {
    res.send({ message: 'BookNook Server is running fine!' });
});

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
});