import { Request, Response, Router } from 'express';
import { s3 } from '../../utils/S3Util';
import AuthMiddleware from '../../middlewares/AuthMiddleware';
import ValidationMiddleware from '../../middlewares/ValidationMiddleware';
import TestimonialSchema from '../../schemas/TestimonialSchema';
import Filter from 'bad-words';
import UserModel from '../../models/UserModel';
import SettingsRouter from './SettingsRouter';
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

        for (const object of objects.Contents) {
            images.push({
                link: `https://cdn.astral.cool/${user._id}/${object.Key.split('/')[1]}`,
                dateUploaded: object.LastModified.toLocaleDateString(),
                filename: object.Key.split('/')[1],
            });
        }

        res.status(200).json({
            success: true,
            images,
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

export default router;
