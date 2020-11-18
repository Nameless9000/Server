import 'dotenv/config';
import {
    AuthRouter,
    DomainsRouter,
    FilesRouter,
    InvitesRouter,
    RootRouter,
    UsersRouter
} from './routes';
import SessionMiddleware from './middlewares/SessionMiddleware';
import express, { json } from 'express';
import { connect } from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    credentials: true,
    origin: process.env.FRONTEND_URL,
}));
app.disable('x-powered-by');
app.use(json());
app.use(cookieParser());
app.use(SessionMiddleware);

app.use('/files', FilesRouter);
app.use('/invites', InvitesRouter);
app.use('/users', UsersRouter);
app.use('/domains', DomainsRouter);
app.use('/auth', AuthRouter);
app.use('/', RootRouter);

app.listen(port, () => {
    console.log(`Listening to port ${port}`);

    connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }, () => {
        console.log('Connected to the database');
    });
});
