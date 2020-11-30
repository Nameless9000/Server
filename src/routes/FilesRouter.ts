import { Request, Response, Router } from 'express';
import { upload } from '../utils/MulterUtil';
import { formatFilesize } from '../utils/FormatUtil';
import { generateString, generateInvisibleId } from '../utils/GenerateUtil';
import UploadMiddleware from '../middlewares/UploadMiddleware';
import FileModel from '../models/FileModel';
import UserModel from '../models/UserModel';
import InvisibleUrlModel from '../models/InvisibleUrlModel';
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

export default router;
