import { Request, Response, Router } from 'express';
import { generateString } from '../utils/GenerateUtil';
import UploadMiddleware from '../middlewares/UploadMiddleware';
import ValidationMiddleware from '../middlewares/ValidationMiddleware';
import ShortenerModel from '../models/ShortenerModel';
import UserModel from '../models/UserModel';
import ConfigSchema from '../schemas/ConfigSchema';
import DeletionSchema from '../schemas/DeletionSchema';
import ShortenerSchema from '../schemas/ShortenerSchema';
import ipLoggers from '../utils/IPLoggers.json';
import AuthMiddleware from '../middlewares/AuthMiddleware';
const router = Router();

function isIpLogger(url: string) {
    for (const ipLogger of ipLoggers) {
        if (url.match(new RegExp(ipLogger, 'i'))) return true;
    }

    return false;
}

router.get('/urls', AuthMiddleware, async (req: Request, res: Response) => {
    const { user } = req;

    try {
        const urls = await ShortenerModel.find({ user: user._id })
            .select('-_id -__v');

        res.status(200).json({
            success: true,
            urls,
            count: urls.length,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.post('/', UploadMiddleware, ValidationMiddleware(ShortenerSchema), async (req: Request, res: Response) => {
    const { user } = req;
    const { url } = req.body;

    if (isIpLogger(url)) {
        if (user.strikes === 3 || user.strikes + 1 === 3) {
            await UserModel.findByIdAndUpdate(user._id, {
                blacklisted: {
                    status: true,
                    reason: 'banned by auto-mod, shortening iploggers',
                },
                strikes: 3,
            });

            res.status(400).json({
                success: false,
                error: 'you have been suspended by auto-mod, create a ticket in the server to appeal',
            });

            return;
        }

        await UserModel.findByIdAndUpdate(user._id, {
            $inc: {
                strikes: +1,
            },
        });

        res.status(400).json({
            success: false,
            error: 'ip logger detected, attempting to shorten any more ip loggers will result in a suspension',
        });

        return;
    }

    try {
        const { domain } = user.settings;
        const longUrl = req.headers.longurl ? req.headers.longurl === 'true' : user.settings.longUrl;

        const shortId = longUrl ? generateString(17): generateString(10);

        const baseUrl = req.headers.domain ?
            req.headers.domain :
            `${domain.subdomain && domain.subdomain !== '' ? `${domain.subdomain}.` : ''}${domain.name}`;

        const deletionKey = generateString(40);
        const deletionUrl = `${process.env.BACKEND_URL}/shortener/delete?key=${deletionKey}`;
        const shortendUrl = `https://${baseUrl}/s/${shortId}`;

        await ShortenerModel.create({
            shortId,
            destination: url,
            deletionKey,
            timestamp: new Date(),
            user: user._id,
        });

        res.status(200).json({
            success: true,
            shortendUrl,
            deletionUrl,
            document: await ShortenerModel.findOne({ shortId }).select('-_id -__v'),
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.get('/delete', ValidationMiddleware(DeletionSchema, 'query'), async (req: Request, res: Response) => {
    const deletionKey = req.query.key as string;
    const shortened = await ShortenerModel.findOne({ deletionKey });

    if (!shortened) return res.status(404).json({
        success: false,
        error: 'invalid deletion key',
    });

    try {
        await shortened.remove();

        res.status(200).json({
            success: true,
            message: 'deleted url successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.get('/config', ValidationMiddleware(ConfigSchema, 'query'), async (req: Request, res: Response) => {
    const key = req.query.key as string;
    const user = await UserModel.findOne({ key });

    if (!user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    const config = {
        Version: '13.3.0',
        Name: 'astral-testing',
        DestinationType: 'URLShortener',
        RequestMethod: 'POST',
        RequestURL: `${process.env.BACKEND_URL}/shortener`,
        Headers: {
            key: user.key,
        },
        Body: 'JSON',
        Data: '{"url":"$input$"}',
        URL: '$json:shortenedUrl$',
        DeletionURL: '$json:deletionUrl$',
        ErrorMessage: '$json:error$',
    };

    res.set('Content-Disposition', 'attachment; filename=shortener.sxcu');
    res.send(Buffer.from(JSON.stringify(config, null, 2), 'utf8'));
});

export default router;
