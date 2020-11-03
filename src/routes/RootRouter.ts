import { Request, Response, Router } from 'express';
import Users from '../models/UserModel';
const router = Router();

router.get('/', (req: Request, res: Response) => {
    res.sendStatus(200);
});

router.get('/testimonial', async (req: Request, res: Response) => {
    const User = await Users.aggregate([{ $sample: { size: 1 } }]);

    res.status(200).json({
        success: true,
        testimonial: {
            user: User[0].username,
            data: User[0].testimonial,
        },
    });
});

export default router;
