import { Request, Response, Router } from 'express';
import Filter from 'bad-words';
import Users from '../models/UserModel';
import AdminMiddleware from '../middlewares/AdminMiddleware';
import { s3 } from '../utils/S3Util';
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
            error: 'Unauthorized.',
        });
});

router.put('/testimonial', async (req: Request, res: Response) => {
    const { testimonial }: { testimonial: string } = req.body;

    if (!req.user) return res.status(401).json({
        success: false,
        error: 'Unauthorized.',
    });

    if (req.user.blacklisted.status) return res.status(401).json({
        success: false,
        error: `You are blacklisted for: ${req.user.blacklisted.reason}`,
    });

    if (!testimonial) return res.status(400).json({
        success: false,
        error: 'Provide a testimonial',
    });

    if (testimonial.trim().length <= 3) return res.status(400).json({
        success: false,
        error: 'Your testimonial is too short.',
    });

    if (filter.isProfane(testimonial)) return res.status(400).json({
        success: false,
        error: 'Your testimonial contains a blacklisted word.',
    });

    await Users.updateOne({ _id: req.user._id }, {
        testimonial,
    }).then(() => {
        res.status(200).json({
            success: true,
            message: 'Updated testimonial successfully.',
        });
    }).catch((err) => {
        res.status(500).json({
            success: false,
            erorr: err.message,
        });
    });
});

router.post('/:id/blacklist', AdminMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params;
    const reason = req.body.reason || 'No reason provided';

    if (!id) return res.status(400).json({
        success: false,
        error: 'Provide a uid.',
    });

    const user = await Users.findOne({ _id: id });

    if (!user) return res.status(404).json({
        success: false,
        error: 'Invalid uid.',
    });

    if (user.blacklisted.status) res.status(400).json({
        success: false,
        error: `This user is already blacklisted for: ${user.blacklisted.reason}`,
    });

    await Users.updateOne({ _id: id }, {
        blacklisted: {
            status: true,
            reason,
        },
    }).then(() => {
        res.status(200).json({
            success: true,
            message: 'Blacklisted user successfully.',
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
        error: 'Provide a uid.',
    });

    const user = await Users.findOne({ _id: id });

    if (!user) return res.status(404).json({
        success: false,
        error: 'Invalid uid.',
    });

    if (!user.blacklisted.status) res.status(400).json({
        success: false,
        error: 'The specified user is not blacklisted',
    });

    await Users.updateOne({ _id: id }, {
        blacklisted: {
            status: false,
            reason: null,
        },
    }).then(() => {
        res.status(200).json({
            success: true,
            message: 'Whitelisted user successfully.',
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
        error: 'Unauthorized.',
    });

    if (!id) return res.status(400).json({
        success: false,
        error: 'Provide a id.',
    });

    user = await Users.findOne({ _id: id });

    if (!user) return res.status(404).json({
        success: false,
        error: 'Invalid id.',
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
        error: 'Provide a uid.',
    });

    let user = await Users.findOne({ _id: id });

    if (!user) return res.status(404).json({
        success: false,
        error: 'Invalid user.',
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
