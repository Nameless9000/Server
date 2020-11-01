import { Request, Response, Router } from 'express';
import Filter from 'bad-words';
import Users from '../models/UserModel';
import AdminMiddleware from '../middlewares/AdminMiddleware';
const filter = new Filter({
    list: ['elerium', 'payshost', 'pxl.blue', 'wizardugc', 'pays.host', 'pxlblue'],
});
const router = Router();

router.get('/count', async (req: Request, res: Response) => {
    try {
        const total = await Users.countDocuments();
        const blacklisted = await Users.countDocuments({ 'blacklisted.status': true });
        res.json({ success: true, total, blacklisted });
    } catch (err) {
        res.json({ success: false, error: err.message });
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

export default router;
