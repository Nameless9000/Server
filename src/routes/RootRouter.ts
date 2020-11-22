import { Request, Response, Router } from 'express';
import Users from '../models/UserModel';
const router = Router();

router.get('/', (req: Request, res: Response) => {
    res.sendStatus(200);
});

router.get('/testimonial', async (req: Request, res: Response) => {
    const users = await Users.find({ testimonial: { $ne: null } });
    const user = users[Math.floor(Math.random() * users.length)];

    res.status(200).json({
        success: true,
        testimonial: {
            user: user.username,
            data: user.testimonial,
        },
    });
});

export default router;
