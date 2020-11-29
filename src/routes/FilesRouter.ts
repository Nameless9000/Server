import { Request, Response, Router } from 'express';
import { upload } from '../utils/MulterUtil';
import { generateString } from '../utils/GenerateUtil';
import UploadMiddleware from '../middlewares/UploadMiddleware';
const router = Router();

router.post('/', UploadMiddleware, upload.single('file'), async (req: Request, res: Response) => {
    const { file } = req;

    if (!file) return res.status(400).json({
        success: false,
        error: 'provide a file',
    });

    const deletionKey = generateString(40);
});

export default router;
