import { Request, Response, Router } from 'express';
import multer, { Multer } from 'multer';
import MulterS3 from 'multer-s3';
import UploadMiddleware from '../middlewares/upload';
import { extname } from 'path';
import { s3 } from '../utils/s3';
const router = Router();

const upload: Multer = multer({
    storage: MulterS3({
        s3,
        contentType: MulterS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        bucket: process.env.S3_BUCKET,
        key: (req: Request, file: Express.Multer.File, cb) => {
            if (req.user) {
                const filename = '123' + extname(file.originalname);
                file.filename = filename;
                cb(null, `${req.user._id}/${filename}`);
            }
        },
    }),
});

router.post('/', UploadMiddleware, upload.single('file'), (req: Request, res: Response) => {
    res.send(`https://cdn.astral.cool/${req.user._id}/${req.file.filename}`);
});

export default router;
