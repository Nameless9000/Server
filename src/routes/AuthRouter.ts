import { Request, Response, Router } from 'express';
import JoiMiddleware from '../middlewares/JoiMiddleware';
import RegisterSchema from '../schemas/RegisterSchema';
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
        error: 'You are already logged in.',
    });
});

export default router;
