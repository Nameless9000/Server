import 'dotenv/config';
import {
    FilesRouter,
    InvitesRouter,
    DomainsRouter,
    AuthRouter,
    BaseRouter,
    UsersRouter,
    ShortenerRouter
} from './routes';
import { connect } from 'mongoose';
import { transporter } from './utils/MailUtil';
import express, { json } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import SessionMiddleware from './middlewares/SessionMiddleware';
import UserModel from './models/UserModel';
import ms from 'ms';
import { intervals } from './utils/Intervals';
import { wipeFiles } from './utils/S3Util';

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
        'ACCESS_TOKEN_SECRET',
        'REFRESH_TOKEN_SECRET',
        'DISCORD_CLIENT_ID',
        'DISCORD_CLIENT_SECRET',
        'DISCORD_LOGIN_URL',
        'DISCORD_LINK_URL',
        'DISCORD_LOGIN_REDIRECT_URI',
        'DISCORD_LINK_REDIRECT_URI',
        'DISCORD_ROLES',
        'DISCORD_SERVER_ID',
        'DISCORD_BOT_TOKEN',
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

    app.use('/', BaseRouter);
    app.use('/files', FilesRouter);
    app.use('/invites', InvitesRouter);
    app.use('/domains', DomainsRouter);
    app.use('/auth', AuthRouter);
    app.use('/users', UsersRouter);
    app.use('/shortener', ShortenerRouter);

    app.use((req, res) => {
        res.status(404).json({
            success: false,
            error: 'invalid page',
        });
    });

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

    (async () => {
        await transporter.verify();

        for (const user of await UserModel.find({ 'settings.autoWipe.enabled': true })) {
            const { interval } = user.settings.autoWipe;
            const validIntervals = [ms('1m'), ms('1h'), ms('2h'), ms('12h'), ms('24h'), ms('1w'), ms('2w'), ms('4w')];

            if (validIntervals.includes(interval)) {
                const findInterval = intervals.find((i) => i.uuid === user._id);
                if (findInterval) clearInterval(findInterval.id);

                const id = setInterval(async () => {
                    await wipeFiles(user);
                }, interval);

                intervals.push({
                    id,
                    uuid: user._id,
                });
            }
        }
    })();
} catch (err) {
    throw new Error(err);
}
