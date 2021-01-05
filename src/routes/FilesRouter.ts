import { Request, Response, Router } from 'express';
import { upload } from '../utils/MulterUtil';
import { s3, wipeFiles } from '../utils/S3Util';
import { formatEmbed, formatFilesize } from '../utils/FormatUtil';
import { generateString, generateInvisibleId } from '../utils/GenerateUtil';
import { DocumentType } from '@typegoose/typegoose';
import { PassThrough } from 'stream';
import UploadMiddleware from '../middlewares/UploadMiddleware';
import FileModel, { File } from '../models/FileModel';
import UserModel, { User } from '../models/UserModel';
import InvisibleUrlModel from '../models/InvisibleUrlModel';
import ValidationMiddleware from '../middlewares/ValidationMiddleware';
import DeletionSchema from '../schemas/DeletionSchema';
import ConfigSchema from '../schemas/ConfigSchema';
import AuthMiddleware from '../middlewares/AuthMiddleware';
import Archiver from 'archiver';
import { extname } from 'path';
const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    try {
        const total = await FileModel.countDocuments();
        const invisibleUrls = await InvisibleUrlModel.countDocuments();

        res.status(200).json({
            success: true,
            total,
            invisibleUrls,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.post('/', UploadMiddleware, upload.single('file'), async (req: Request, res: Response) => {
    let {
        file,
        user,
    }: {
        file: Express.Multer.File | DocumentType<File>,
        user: User
    } = req;

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
    const timestamp = new Date();

    file = new FileModel({
        filename: file.filename,
        key: file.key,
        timestamp,
        mimetype: file.mimetype,
        domain: req.headers.domain ? req.headers.domain : user.settings.domain.name,
        userOnlyDomain: file.userOnlyDomain ? file.userOnlyDomain : false,
        size: formatFilesize(file.size),
        deletionKey,
        embed,
        showLink,
        uploader: {
            uuid: user._id,
            username: user.username,
        },
    });

    file.embed = formatEmbed(embed, user, file);

    await file.save();

    if (req.headers.invisibleurl ? req.headers.invisibleurl === 'true' : invisibleUrl) {
        const invisibleUrlId = generateInvisibleId();

        await InvisibleUrlModel.create({
            _id: invisibleUrlId,
            filename: file.filename,
            uploader: user._id,
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

router.get('/delete', ValidationMiddleware(DeletionSchema, 'query'), async (req: Request, res: Response) => {
    const deletionKey = req.query.key as string;
    const file = await FileModel.findOne({ deletionKey });

    if (!file) return res.status(404).json({
        success: false,
        error: 'invalid deletion key',
    });

    const user = await UserModel.findById(file.uploader.uuid);

    const params = {
        Bucket: process.env.S3_BUCKET,
        Key: file.key,
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

router.delete('/:id', AuthMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { user } = req;

    const file = await FileModel.findOne({ filename: id });

    if (!file) return res.status(404).json({
        success: false,
        error: 'invalid file',
    });

    const params = {
        Bucket: process.env.S3_BUCKET,
        Key: file.key,
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

router.post('/wipe', AuthMiddleware, async (req: Request, res: Response) => {
    const { user } = req;

    try {
        const count = await wipeFiles(user);

        await FileModel.deleteMany({
            'uploader.uuid': user._id,
        });

        await InvisibleUrlModel.deleteMany({
            uploader: user._id,
        });

        await UserModel.findByIdAndUpdate(user._id, {
            uploads: 0,
        });

        res.status(200).json({
            success: true,
            message: `wiped ${count} files successfully`,
            count,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.get('/config', ValidationMiddleware(ConfigSchema, 'query'), async (req: Request, res: Response) => {
    const key = req.query.key as string;
    const user = await UserModel.findOne({ key });

    if (!user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    const config = {
        Name: 'astral.cool',
        DestinationType: 'ImageUploader, FileUploader',
        RequestType: 'POST',
        RequestURL: `${process.env.BACKEND_URL}/files`,
        FileFormName: 'file',
        Body: 'MultipartFormData',
        Headers: {
            key,
        },
        URL: '$json:imageUrl$',
        DeletionURL: '$json:deletionUrl$',
        ErrorMessage: '$json:error$',
    };

    res.set('Content-Disposition', 'attachment; filename=config.sxcu');
    res.send(Buffer.from(JSON.stringify(config, null, 2), 'utf8'));
});

function writeStream(key: string) {
    const passThrough = new PassThrough();

    const params = {
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: passThrough,
    };

    return {
        passThrough,
        uploaded: s3.upload(params, (err) => {
            throw new Error(err);
        }),
    };
}

router.get('/archive', async (req: Request, res: Response) => {
    try {
        const params = {
            Bucket: process.env.S3_BUCKET,
            Prefix: 'testing/',
        };

        const objects = await s3.listObjectsV2(params).promise();
        const streams = objects.Contents.map((object) => {
            return {
                stream: s3.getObject({ Bucket: process.env.S3_BUCKET, Key: object.Key }).createReadStream(),
                object: object,
            };
        });

        const { passThrough, uploaded } = writeStream(`testing/${generateString(5)}.zip`);

        await new Promise((resolve, reject) => {
            const archive = Archiver('zip');

            archive.on('error', (err) => {
                throw new Error(err.message);
            });

            passThrough.on('close', resolve);
            passThrough.on('end', resolve);
            passThrough.on('error', reject);

            archive.pipe(passThrough);

            let i = 1;

            streams.forEach((ctx) => {
                if (!ctx.object.Key.endsWith('/') && extname(ctx.object.Key) !== '.zip') {
                    archive.append(ctx.stream, {
                        name: i.toString() + extname(ctx.object.Key),
                    });

                    i++;
                }
            });

            archive.finalize();
        }).catch((err) => {
            console.log(err);
        });

        const { Key } = await uploaded.promise();

        res.setHeader('Content-Type', 'application/zip');
        s3.getObject({ Bucket: process.env.S3_BUCKET, Key }).createReadStream().pipe(res);
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

export default router;
