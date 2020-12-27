import { Request, Response, Router } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.sendStatus(200);
});

export default router;
