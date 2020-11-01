import 'dotenv/config';
import {
    DomainsRouter,
    FilesRouter,
    InvitesRouter,
    UsersRouter
} from './routes';
import express, { json } from 'express';
import { connect } from 'mongoose';
const app = express();
const port = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(json());

app.use('/files', FilesRouter);
app.use('/invites', InvitesRouter);
app.use('/users', UsersRouter);
app.use('/domains', DomainsRouter);

app.listen(port, () => {
    console.log(`Listening to port ${port}`);

    connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }, () => {
        console.log('Connected to the database.');
    });
});
