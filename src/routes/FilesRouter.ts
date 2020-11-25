import { Request, Response, Router } from 'express';
import { generateShortUrl, generateString } from '../utils/GenerateUtil';
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
import { formatFilesize } from '../utils/FormatUtil';
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
    limits: {
        fileSize: 50 * 1e+6,
    },
});

router.post('/', UploadMiddleware, upload.single('file'), async (req: Request, res: Response) => {
    const file = req.file;

    if (!file) return res.status(400).json({
        success: false,
        error: 'provide a file',
    });

    const deletionKey = generateString(40);
    const { user } = req;
    const { embed } = user.settings;
    const { domain } = user.settings;

    await Files.create({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: formatFilesize(file.size),
        deletionKey,
        dateUploaded: new Date().toLocaleString(),
        displayType: embed.enabled ? 'embed' : 'raw',
        showLink: req.headers.showlink ? req.headers.showlink === 'true' : user.settings.showLink,
        embed,
        uploader: {
            username: user.username,
            uid: user._id,
        },
    });

    await Users.updateOne({
        _id: user._id,
    }, {
        $inc: { uploads: +1 },
    });

    let baseUrl = `https://${domain.subdomain !== '' && domain.subdomain !== null ? domain.subdomain + '.' : ''}${domain.name}`;

    if (req.headers.domain) baseUrl = `https://${req.headers.domain}`;
    if (req.headers.randomdomain ? req.headers.randomdomain === 'true' : user.settings.randomDomain.enabled)
        baseUrl = `https://${user.settings.randomDomain.domains[Math.floor(Math.random() * user.settings.randomDomain.domains.length)] || 'astral.cool'}`;

    let imageUrl = `${baseUrl}/${file.filename}`;

    if (req.headers.invisiblelink ? req.headers.invisiblelink === 'true' : user.settings.invisibleUrl) {
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
});

router.get('/delete', JoiMiddleware(DeletionSchema, 'query'), async (req: Request, res: Response) => {
    const key = req.query.key as string;
    const file = await Files.findOne({ deletionKey: key });

    if (!file) return res.status(404).json({
        success: false,
        error: 'invalid deletion key',
    });

    const user = await Users.findOne({ username: file.uploader.username });

    if (!user) return res.status(404).json({
        success: false,
        error: 'the user attached to this file does not exist',
    });

    const params = {
        Bucket: process.env.S3_BUCKET,
        Key: `${user._id}/${file.filename}`,
    };

    await s3.deleteObject(params).promise()
        .then(async () => {
            await Users.updateOne({ _id: file.uploader.uid }, {
                $inc: { uploads: -1 },
            });
            await file.remove();
            res.status(200).json({
                success: true,
                message: 'deleted file successfully',
            });
        }).catch((err) => {
            res.status(500).json({
                success: false,
                error: err.message,
            });
        });
});

router.delete('/:file', async (req: Request, res: Response) => {
    const id = req.params.file;
    let { user } = req;

    if (!id) return res.status(400).json({
        success: false,
        error: 'provide a id',
    });

    if (!user) return res.status(401).json({
        success: false,
        error: 'invalid user',
    });

    user = await Users.findOne({ _id: user._id });

    if (!user) return res.status(401).json({
        success: false,
        error: 'invalid user',
    });

    const file = await Files.findOne({ filename: id });

    if (!file) return res.status(404).json({
        success: false,
        error: 'invalid file',
    });

    const params = {
        Bucket: process.env.S3_BUCKET,
        Key: `${user._id}/${file.filename}`,
    };

    try {
        await s3.deleteObject(params).promise();
        await Users.updateOne({ _id: file.uploader.uid }, {
            $inc: { uploads: -1 },
        });
        await file.remove();

        res.status(200).json({
            success: true,
            message: 'deleted file successfully',
        });
    } catch (err) {
        console.log(err.message);
    }
});

router.post('/wipe', async (req: Request, res: Response) => {
    let { user } = req;

    if (!user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    user = await Users.findOne({ _id: user._id });

    if (!user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    await wipeFiles(user)
        .then(async () => {
            await Users.updateOne({ _id: user._id }, {
                uploads: 0,
            });
            res.status(200).json({
                success: true,
                message: 'wiped images successfully',
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
        error: 'unauthorized',
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
