import { Request, Response, Router } from 'express';
import UserModel from '../../models/UserModel';
const router = Router();

router.get('/', async (req: Request, res: Response) => {
    let { user } = req;

    if (!user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    user = await UserModel.findById(user._id)
        .select('-__v -password');

    if (user.blacklisted.status) return res.status(401).json({
        success: false,
        error: `you are blacklisted for: ${user.blacklisted.reason}`,
    });

    res.status(200).json(user);
});

export default router;
