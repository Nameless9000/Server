import 'dotenv/config';
import {
    FilesRouter,
    InvitesRouter,
    DomainsRouter,
    AuthRouter
} from './routes';
import { connect } from 'mongoose';
import { transporter } from './utils/MailUtil';
import express, { json } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import SessionMiddleware from './middlewares/SessionMiddleware';

const app = express();
const PORT = process.env.PORT || 3000;

try {
    const errors = [];
    const requiredEnvs = [
        'MONGO_URI',
        'API_KEY',
        'BACKEND_URL',
        'FRONTEND_URL',
        'S3_SECRET_KEY',
        'S3_ACCESS_KEY_ID',
        'S3_ENDPOINT',
        'S3_BUCKET',
        'CLOUDFLARE_API_KEY',
        'CLOUDFLARE_ACCOUNT_ID',
        'CLOUDFLARE_EMAIL',
        'WEBHOOK_URL',
        'GSUITE_CLIENT_ID',
        'JWT_SECRET',
        'DISCORD_CLIENT_ID',
        'DISCORD_CLIENT_SECRET',
        'DISCORD_OAUTH_LOGIN_URL',
        'DISCORD_LINK_REDIRECT_URI',
    ];

    for (const env of requiredEnvs) {
        if (!process.env.hasOwnProperty(env)) {
            errors.push(env);
        }
    }

    if (errors.length > 0) throw new Error(
        `${errors.join(', ')} ${errors.length > 1 ? 'are' : 'is'} required`
    );

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
    app.use('/domains', DomainsRouter);
    app.use('/auth', AuthRouter);

    app.listen(PORT, () => {
        console.log(`Listening to port ${PORT}`);
    });

    connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
    }, () => {
        console.log('Connected to MongoDB cluster');
    });

    (async () => await transporter.verify())();
} catch (err) {
    throw new Error(err);
}
