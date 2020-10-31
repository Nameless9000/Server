import { Request, Response, Router } from 'express';
import {
    generateFileName,
    generateDeletionKey
} from '../utils/GenerateUtil';
import { logFile } from '../utils/LoggingUtil';
import { extname } from 'path';
import { s3 } from '../utils/S3Util';
import multer, { Multer } from 'multer';
import MulterS3 from 'multer-s3';
import UploadMiddleware from '../middlewares/UploadMiddleware';
import Files from '../models/FileModel';
import Users from '../models/UserModel';
const router = Router();

const upload: Multer = multer({
    storage: MulterS3({
        s3,
        contentType: MulterS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        bucket: process.env.S3_BUCKET,
        key: (req: Request, file: Express.Multer.File, cb) => {
            if (req.user) {
                const filename = generateFileName() + extname(file.originalname);
                file.filename = filename;
                cb(null, `${req.user._id}/${filename}`);
            }
        },
    }),
});

router.post('/', UploadMiddleware, upload.single('file'), async (req: Request, res: Response) => {
    const file = req.file;

    if (!file) return res.status(400).json({
        success: false,
        error: 'Provide a file.',
    });

    const { user } = req;
    const { embed } = user.settings;
    const deletionKey = generateDeletionKey();

    const uploadedFile = await Files.create({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        deletionKey,
        dateUploaded: new Date().toLocaleDateString(),
        displayType: embed.enabled ? 'embed' : 'raw',
        showLink: user.settings.showLink,
        embed,
        uploader: {
            username: user.username,
            uid: user._id,
        },
    });

    await logFile(uploadedFile, user)
        .then(async () => {
            await Users.updateOne({
                _id: user._id,
            }, {
                $inc: { uploads: +1 },
            });

            const { domain } = user.settings;

            res.status(200).json({
                success: true,
                imageUrl: `https://${domain.subdomain !== '' && domain.subdomain !== null ? domain.subdomain + '.' : ''}${domain.name}/${file.filename}`,
                deletionUrl: `${process.env.BACKEND_URL}/files/delete?key=${deletionKey}`,
            });
        }).catch((err) => {
            res.status(500).json({
                success: false,
                error: err.message,
            });
        });
});

export default router;
