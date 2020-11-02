import { Request, Response, Router } from 'express';
import Filter from 'bad-words';
import Users from '../models/UserModel';
import AdminMiddleware from '../middlewares/AdminMiddleware';
import { s3 } from '../utils/S3Util';
import JoiMiddleware from '../middlewares/JoiMiddleware';
import TestimonialSchema from '../schemas/TestimonialSchema';
import BlacklistSchema from '../schemas/BlacklistSchema';
const filter = new Filter({
    list: ['elerium', 'payshost', 'pxl.blue', 'prophecy.photos', 'pays.host', 'pxlblue', 'prophecy'],
});
const router = Router();

router.get('/count', async (req: Request, res: Response) => {
    try {
        const total = await Users.countDocuments();
        const blacklisted = await Users.countDocuments({ 'blacklisted.status': true });
        res.status(200).json({
            success: true,
            total,
            blacklisted,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.get('/@me', (req: Request, res: Response) => {
    req.user ?
        res.status(200).json(req.user) :
        res.status(401).json({
            success: false,
            error: 'unauthorized',
        });
});

router.put('/testimonial', JoiMiddleware(TestimonialSchema, 'body'), async (req: Request, res: Response) => {
    const { testimonial }: { testimonial: string } = req.body;

    if (!req.user) return res.status(401).json({
        success: false,
        error: 'Unauthorized.',
    });

    if (req.user.blacklisted.status) return res.status(401).json({
        success: false,
        error: `you are blacklisted for: ${req.user.blacklisted.reason}`,
    });

    if (filter.isProfane(testimonial)) return res.status(400).json({
        success: false,
        error: 'your testimonial contains a blacklisted word',
    });

    await Users.updateOne({ _id: req.user._id }, {
        testimonial,
    }).then(() => {
        res.status(200).json({
            success: true,
            message: 'updated testimonial successfully',
        });
    }).catch((err) => {
        res.status(500).json({
            success: false,
            erorr: err.message,
        });
    });
});

router.post('/:id/blacklist', AdminMiddleware, JoiMiddleware(BlacklistSchema, 'body'), async (req: Request, res: Response) => {
    const { id } = req.params;
    const reason = req.body.reason || 'No reason provided';

    if (!id) return res.status(400).json({
        success: false,
        error: 'provide a uid',
    });

    const user = await Users.findOne({ _id: id });

    if (!user) return res.status(404).json({
        success: false,
        error: 'invalid uid',
    });

    if (user.blacklisted.status) res.status(400).json({
        success: false,
        error: `this user is already blacklisted for: ${user.blacklisted.reason}`,
    });

    await Users.updateOne({ _id: id }, {
        blacklisted: {
            status: true,
            reason,
        },
    }).then(() => {
        res.status(200).json({
            success: true,
            message: 'blacklisted user successfully',
        });
    }).catch((err) => {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    });
});

router.post('/:id/whitelist', AdminMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) return res.status(400).json({
        success: false,
        error: 'provide a uid',
    });

    const user = await Users.findOne({ _id: id });

    if (!user) return res.status(404).json({
        success: false,
        error: 'invalid uid',
    });

    if (!user.blacklisted.status) res.status(400).json({
        success: false,
        error: 'the specified user is not blacklisted',
    });

    await Users.updateOne({ _id: id }, {
        blacklisted: {
            status: false,
            reason: null,
        },
    }).then(() => {
        res.status(200).json({
            success: true,
            message: 'whitelisted user successfully',
        });
    }).catch((err) => {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    });
});

router.get('/:id/images', async (req: Request, res: Response) => {
    let { user } = req;
    const { id } = req.params;
    const key = req.headers.authorization as string;

    if (!key && !user || (key !== process.env.API_KEY)) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    if (!id) return res.status(400).json({
        success: false,
        error: 'provide a id',
    });

    user = await Users.findOne({ _id: id });

    if (!user) return res.status(404).json({
        success: false,
        error: 'invalid id',
    });

    const params = {
        Bucket: process.env.S3_BUCKET,
        Prefix: `${user._id}/`,
    };

    const objects = await s3.listObjectsV2(params).promise();
    const images = [];

    for (const object of objects.Contents) {
        images.push(`https://astral.cool/${object.Key.split('/')[1]}`);
    }

    res.status(200).json({
        success: true,
        images,
    });
});

router.get('/:id', AdminMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) return res.status(400).json({
        success: false,
        error: 'provide a uid',
    });

    let user = await Users.findOne({ _id: id });

    if (!user) return res.status(404).json({
        success: false,
        error: 'invalid user',
    });

    user = user.toObject();
    delete user.__v;
    delete user.password;

    res.status(200).json({
        success: true,
        user,
    });
});

export default router;
