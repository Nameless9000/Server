import { Request, Response, Router } from 'express';
import JoiMiddleware from '../middlewares/JoiMiddleware';
import RegisterSchema from '../schemas/RegisterSchema';
import Users from '../models/UserModel';
import Invites from '../models/InviteModel';
const router = Router();

router.post('/register', JoiMiddleware(RegisterSchema, 'body'), async (req: Request, res: Response) => {
    const { email, username, password, invite }: {
        email: string,
        username: string,
        password: string,
        invite: string
    } = req.body;

    if (req.user) return res.status(400).json({
        success: false,
        error: 'you are already logged in',
    });

    const userExists = await Users.findOne({ username: { $regex: new RegExp(username, 'i') } });

    if (userExists) return res.status(400).json({
        success: false,
        error: 'this username already exists',
    });

    const inviteExists = await Invites.findOne({ _id: invite });

    if (!inviteExists) return res.status(400).json({
        success: false,
        error: 'invalid invite code',
    });
});

export default router;
