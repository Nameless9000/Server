import { Request, Response, Router } from 'express';
import AdminMiddleware from '../../middlewares/AdminMiddleware';
import UserModel from '../../models/UserModel';
import MeRouter from './@me';
const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    try {
        const total = await UserModel.countDocuments();
        const blacklisted = await UserModel.countDocuments({ 'blacklisted.status': true });

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

router.get('/:id', AdminMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await UserModel.findById(id)
        .select('-__v -password');

    res.status(200).json({
        success: true,
        user,
    });
});

router.use('/@me', MeRouter);

export default router;
