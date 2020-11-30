import { Request, Response, Router } from 'express';
import { upload } from '../utils/MulterUtil';
import { s3, wipeFiles } from '../utils/S3Util';
import { formatFilesize } from '../utils/FormatUtil';
import { generateString, generateInvisibleId } from '../utils/GenerateUtil';
import UploadMiddleware from '../middlewares/UploadMiddleware';
import FileModel from '../models/FileModel';
import UserModel from '../models/UserModel';
import InvisibleUrlModel from '../models/InvisibleUrlModel';
import ValidationMiddleware from '../middlewares/ValidationMiddleware';
import DeletionSchema from '../schemas/DeletionSchema';
const router = Router();

router.post('/', UploadMiddleware, upload.single('file'), async (req: Request, res: Response) => {
    const { file } = req;
    const { user } = req;

    if (!file) return res.status(400).json({
        success: false,
        error: 'provide a file',
    });

    const { domain, randomDomain, embed, showLink, invisibleUrl } = user.settings;

    let baseUrl = req.headers.domain ?
        req.headers.domain :
        `${domain.subdomain && domain.subdomain !== '' ? `${domain.subdomain}.` : ''}${domain.name}`;

    if (req.headers.randomdomain ? req.headers.randomdomain === 'true' : randomDomain.enabled) baseUrl = randomDomain.domains.length > 0 ?
        randomDomain.domains[Math.floor(Math.random() * randomDomain.domains.length)] :
        baseUrl;

    let imageUrl = `https://${baseUrl}/${file.filename}`;

    const deletionKey = generateString(40);
    const deletionUrl = `${process.env.BACKEND_URL}/files/delete?key=${deletionKey}`;

    await FileModel.create({
        _id: file.filename,
        dateUploaded: new Date().toLocaleString(),
        mimetype: file.mimetype,
        size: formatFilesize(file.size),
        deletionKey,
        embed,
        showLink,
        uploader: {
            uuid: user._id,
            username: user.username,
        },
    });

    if (req.headers.invisibleurl ? req.headers.invisibleurl === 'true' : invisibleUrl) {
        const invisibleUrlId = generateInvisibleId();

        await InvisibleUrlModel.create({
            _id: invisibleUrlId,
            filename: file.filename,
        });

        imageUrl = `https://${baseUrl}/${invisibleUrlId}`;
    }

    await UserModel.findByIdAndUpdate(user._id, {
        $inc: {
            uploads: +1,
        },
    });

    res.status(200).json({
        success: true,
        imageUrl,
        deletionUrl,
    });
});

router.delete('/delete', ValidationMiddleware(DeletionSchema, 'query'), async (req: Request, res: Response) => {
    const deletionKey = req.query.key as string;
    const file = await FileModel.findOne({ deletionKey });

    if (!file) return res.status(404).json({
        success: false,
        error: 'invalid deletion key',
    });

    const user = await UserModel.findById(file.uploader.uuid);

    const params = {
        Bucket: process.env.S3_BUCKET,
        Key: `${user._id || file.uploader.uuid}/${file._id}`,
    };

    try {
        await s3.deleteObject(params).promise();

        if (user.uploads > 0) await UserModel.findByIdAndUpdate(user._id, {
            $inc: {
                uploads: -1,
            },
        });

        await file.remove();

        res.status(200).json({
            success: true,
            message: 'deleted file successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.post('/wipe', async (req: Request, res: Response) => {
    let { user } = req;

    if (!user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    user = await UserModel.findById(user._id);

    if (!user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    try {
        await wipeFiles(user);

        await FileModel.deleteMany({
            'uploader.uuid': user._id,
        });

        await UserModel.findByIdAndUpdate(user._id, {
            uploads: 0,
        });

        res.status(200).json({
            success: true,
            message: 'wiped images successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.get('/count', async (_req: Request, res: Response) => {
    try {
        const total = await FileModel.countDocuments();

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

export default router;
