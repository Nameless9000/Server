import { Request, Response, Router } from 'express';
import { s3 } from '../../utils/S3Util';
import AuthMiddleware from '../../middlewares/AuthMiddleware';
import ValidationMiddleware from '../../middlewares/ValidationMiddleware';
import TestimonialSchema from '../../schemas/TestimonialSchema';
import Filter from 'bad-words';
import UserModel from '../../models/UserModel';
import SettingsRouter from './SettingsRouter';
import { formatFilesize } from '../../utils/FormatUtil';
import { generateString } from '../../utils/GenerateUtil';
import InviteModel from '../../models/InviteModel';
const router = Router();

const filter = new Filter({
    list: [
        'payshost',
        'pxl.blue',
        'prophecy.photos',
        'pays.host',
        'pxlblue',
        'prophecy',
        'pxl',
        'pays',
        'owo',
    ],
});

router.use(AuthMiddleware);
router.use('/settings', SettingsRouter);

router.get('/', async (req: Request, res: Response) => {
    const { user } = req;

    res.status(200).json(user);
});

router.put('/testimonial', ValidationMiddleware(TestimonialSchema), async (req: Request, res: Response) => {
    const { user } = req;
    const { testimonial }: {
        testimonial: string;
    } = req.body;

    if (filter.isProfane(testimonial)) return res.status(400).json({
        success: false,
        error: 'your testimonial contains a blacklisted word',
    });

    try {
        await UserModel.findByIdAndUpdate(user._id, {
            testimonial,
        });

        res.status(200).json({
            success: true,
            message: 'updated testimonial successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.get('/images', async (req: Request, res: Response) => {
    const { user } = req;

    try {
        const params = {
            Bucket: process.env.S3_BUCKET,
            Prefix: `${user._id}/`,
        };

        const objects = await s3.listObjectsV2(params).promise();
        objects.Contents.sort((a, b) => b.LastModified.getTime() - a.LastModified.getTime());

        const images = [];
        let storageUsed = 0;

        for (const object of objects.Contents) {
            storageUsed += object.Size;

            images.push({
                link: `https://cdn.astral.cool/${user._id}/${object.Key.split('/')[1]}`,
                dateUploaded: object.LastModified,
                filename: object.Key.split('/')[1],
                size: formatFilesize(object.Size),
            });
        }

        res.status(200).json({
            success: true,
            images,
            storageUsed: formatFilesize(storageUsed),
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.post('/disable', async (req: Request, res: Response) => {
    const { user } = req;

    try {
        await UserModel.findByIdAndUpdate(user._id, {
            blacklisted: {
                status: true,
                reason: 'disabled account',
            },
        });

        res.clearCookie('jwt');

        res.status(200).json({
            success: true,
            message: 'disabled account successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.post('/regen_key', async (req: Request, res: Response) => {
    const { user } = req;

    try {
        const now = Date.now();
        const difference = user.lastKeyRegen && now - user.lastKeyRegen.getTime();
        const duration = 43200000 - difference;

        if (user.lastKeyRegen && duration > 0) {
            const hours = Math.floor(duration / 1000 / 60 / 60);
            const minutes = Math.floor((duration / 1000 / 60 / 60 - hours) * 60);
            const timeLeft = `${hours} hours and ${minutes} minutes`;

            res.status(400).json({
                success: false,
                error: `you cannot regen your key for another ${timeLeft}`,
            });

            return;
        }

        const key = `astral_${generateString(30)}`;

        await UserModel.findByIdAndUpdate(user._id, {
            lastKeyRegen: new Date(),
            key,
        });

        res.status(200).json({
            success: true,
            key,
            message: 'regenerated key successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.get('/created_invites', async (req: Request, res: Response) => {
    const { user } = req;

    try {
        // eslint-disable-next-line quote-props
        const invites = await InviteModel.find({ 'createdBy.uuid': user._id, useable: true })
            .select('-__v -createdBy');

        res.status(200).json({
            success: true,
            invites,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

export default router;
