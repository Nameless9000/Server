import { Request, Response, Router } from 'express';
import { generateShortUrl, generateString } from '../utils/GenerateUtil';
import { logFile } from '../utils/LoggingUtil';
import { extname } from 'path';
import { s3, wipeFiles } from '../utils/S3Util';
import UploadMiddleware from '../middlewares/UploadMiddleware';
import multer, { Multer } from 'multer';
import MulterS3 from 'multer-s3';
import Files from '../models/FileModel';
import Users from '../models/UserModel';
import InvisibleUrl from '../models/InvisibleUrlModel';
import JoiMiddleware from '../middlewares/JoiMiddleware';
import DeletionSchema from '../schemas/DeletionSchema';
import ConfigSchema from '../schemas/ConfigSchema';
const router = Router();

const upload: Multer = multer({
    storage: MulterS3({
        s3,
        contentType: MulterS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        bucket: process.env.S3_BUCKET,
        key: (req: Request, file: Express.Multer.File, cb) => {
            if (req.user) {
                const filename = generateString(10) + extname(file.originalname);
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

    const deletionKey = generateString(40);
    const { user } = req;
    const { embed } = user.settings;
    const { domain } = user.settings;

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

            const baseUrl = `https://${domain.subdomain !== '' && domain.subdomain !== null ? domain.subdomain + '.' : ''}${domain.name}`;
            let imageUrl = `${baseUrl}/${file.filename}`;

            if (user.settings.invisibleUrl) {
                const shortUrlId = generateShortUrl();
                await InvisibleUrl.create({
                    _id: shortUrlId,
                    filename: file.filename,
                    uid: user._id,
                });
                imageUrl = `${baseUrl}/${shortUrlId}`;
            }

            res.status(200).json({
                success: true,
                imageUrl,
                deletionUrl: `${process.env.BACKEND_URL}/files/delete?key=${deletionKey}`,
            });
        }).catch((err) => {
            res.status(500).json({
                success: false,
                message: 'Something went wrong while logging your image.',
                error: err.message,
            });
        });
});

router.get('/delete', JoiMiddleware(DeletionSchema, 'query'), async (req: Request, res: Response) => {
    const key = req.query.key as string;
    const file = await Files.findOne({ deletionKey: key });

    if (!file) return res.status(404).json({
        success: false,
        error: 'Invalid deletion key.',
    });

    const user = await Users.findOne({ username: file.uploader.username });

    if (!user) return res.status(404).json({
        success: false,
        error: 'The user attached to this file does not exist.',
    });

    const params = {
        Bucket: process.env.S3_BUCKET,
        Key: `${user._id}/${file.filename}`,
    };

    await s3.deleteObject(params).promise()
        .then(async () => {
            await file.remove();
            res.status(200).json({
                success: true,
                message: 'Deleted file successfully.',
            });
        }).catch((err) => {
            res.status(500).json({
                success: false,
                error: err.message,
            });
        });
});

router.post('/wipe', async (req: Request, res: Response) => {
    let { user } = req;

    if (!user) return res.status(401).json({
        success: false,
        error: 'Unauthorized.',
    });

    user = await Users.findOne({ _id: user._id });

    if (!user) return res.status(401).json({
        success: false,
        error: 'Unauthorized.',
    });

    await wipeFiles(user)
        .then(() => {
            res.status(200).json({
                success: true,
                message: 'Wiped images successfully.',
            });
        }).catch((err) => {
            res.status(500).json({
                success: false,
                error: err.message,
            });
        });
});

router.get('/count', async (req: Request, res: Response) => {
    try {
        const total = await Files.countDocuments();
        res.status(200).json({
            success: true,
            total,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.get('/config', JoiMiddleware(ConfigSchema, 'query'), async (req: Request, res: Response) => {
    const key = req.query.key as string;
    const user = await Users.findOne({ key });

    if (!user) return res.status(401).json({
        success: false,
        error: 'Unauthorized.',
    });

    const config = {
        Name: 'astral.cool',
        DestinationType: 'ImageUploader',
        RequestType: 'POST',
        RequestURL: `${process.env.BACKEND_URL}/files`,
        FileFormName: 'file',
        Body: 'MultipartFormData',
        Headers: {
            key,
        },
        URL: '$json:imageUrl$',
        DeletionURL: '$json:deletionUrl$',
    };

    res.set('Content-Disposition', 'attachment; filename=config.sxcu');
    res.send(Buffer.from(JSON.stringify(config, null, 2), 'utf8'));
});

export default router;
