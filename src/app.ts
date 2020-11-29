import 'dotenv/config';
import express, { json } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connect } from 'mongoose';

const app = express();
const PORT = process.env.PORT || 3000;

try {
    app.use(cors({
        credentials: true,
        origin: process.env.FRONTEND_URL,
    }));

    app.disable('x-powered-by');
    app.use(json());
    app.use(cookieParser());

    app.listen(PORT, () => {
        console.log(`Listening to port ${PORT}`);
    });

    connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }, () => {
        console.log('Connected to MongoDB cluster');
    });
} catch (err) {
    throw new Error(err);
}
