import { Request, Response, Router } from 'express';
import Filter from 'bad-words';
import Users from '../models/UserModel';
import AdminMiddleware from '../middlewares/AdminMiddleware';
import { s3 } from '../utils/S3Util';
import JoiMiddleware from '../middlewares/JoiMiddleware';
import TestimonialSchema from '../schemas/TestimonialSchema';
import BlacklistSchema from '../schemas/BlacklistSchema';
import UpdateDomainSchema from '../schemas/UpdateDomainSchema';
import AddRandomDomainSchema from '../schemas/AddRandomDomainSchema';
import DeleteRandomDomainSchema from '../schemas/DeleteRandomDomainSchema';
import SettingsSchema from '../schemas/SettingsSchema';
import EmbedSchema from '../schemas/EmbedSchema';
const filter = new Filter({
    list: ['payshost', 'pxl.blue', 'prophecy.photos', 'pays.host', 'pxlblue', 'prophecy', 'pxl'],
});
const router = Router();

router.get('/count', async (req: Request, res: Response) => {
    try {
        const total = await Users.countDocuments();
        const blacklisted = await Users.countDocuments({ 'blacklisted.status': true });
        res.status(200).json({
            success: true,
            total,
            blacklisted,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.get('/@me', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    let user = await Users.findOne({ _id: req.user._id });

    if (!user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    if (user.blacklisted.status) return res.status(401).json({
        success: false,
        error: `you are blacklisted for ${user.blacklisted.reason}`,
    });

    user = user.toObject();
    delete user.password;

    res.status(200).json(user);
});

router.put('/@me/domain', JoiMiddleware(UpdateDomainSchema, 'body'), async (req: Request, res: Response) => {
    let { user } = req;
    const { type, domain, subdomain } = req.body;

    if (!user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    try {
        user = await Users.findOne({ _id: user._id });

        if (!user) return res.status(401).json({
            success: false,
            error: 'unauthorized',
        });

        if (!user.emailVerificationKey) return res.status(401).json({
            success: false,
            error: 'please verify your email',
        });

        if (user.blacklisted.status) return res.status(401).json({
            success: false,
            error: `you are blacklisted for: ${req.user.blacklisted.reason}`,
        });

        if (type === 'wildcard') {
            await Users.updateOne({ _id: user._id }, {
                'settings.domain': {
                    name: domain.name,
                    subdomain,
                },
            });
        } else if (type === 'normal') {
            await Users.updateOne({ _id: user._id }, {
                'settings.domain': {
                    name: domain.name,
                    subdomain: '',
                },
            });
        }

        res.status(200).json({
            success: true,
            message: 'updated domain successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.put('/@me/randomDomain', JoiMiddleware(AddRandomDomainSchema, 'body'), async (req: Request, res: Response) => {
    let { user } = req;
    const { domain } = req.body;

    if (!user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    try {
        user = await Users.findOne({ _id: user._id });

        if (!user) return res.status(401).json({
            success: false,
            error: 'unauthorized',
        });

        if (!user.emailVerificationKey) return res.status(401).json({
            success: false,
            error: 'please verify your email',
        });

        if (user.blacklisted.status) return res.status(401).json({
            success: false,
            error: `you are blacklisted for: ${req.user.blacklisted.reason}`,
        });

        await Users.updateOne({ _id: user._id }, {
            $push: {
                'settings.randomDomain.domains': domain,
            },
        });

        res.status(200).json({
            success: true,
            message: 'added domain successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.delete('/@me/randomDomain', JoiMiddleware(DeleteRandomDomainSchema, 'body'), async (req: Request, res: Response) => {
    let { user } = req;
    const { domain } = req.body;

    if (!user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    try {
        user = await Users.findOne({ _id: user._id });

        if (!user) return res.status(401).json({
            success: false,
            error: 'unauthorized',
        });

        if (!user.emailVerificationKey) return res.status(401).json({
            success: false,
            error: 'please verify your email',
        });

        if (user.blacklisted.status) return res.status(401).json({
            success: false,
            error: `you are blacklisted for: ${req.user.blacklisted.reason}`,
        });

        await Users.updateOne({ _id: user._id }, {
            'settings.randomDomain.domains': user.settings.randomDomain.domains.filter((d) => d !== domain),
        });

        res.status(200).json({
            success: true,
            message: 'deleted domain successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.put('/@me/settings', JoiMiddleware(SettingsSchema, 'body'), async (req: Request, res: Response) => {
    let { user } = req;

    if (!user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    try {
        user = await Users.findOne({ _id: user._id });

        if (!user) return res.status(401).json({
            success: false,
            error: 'unauthorized',
        });

        if (!user.emailVerificationKey) return res.status(401).json({
            success: false,
            error: 'please verify your email',
        });

        if (user.blacklisted.status) return res.status(401).json({
            success: false,
            error: `you are blacklisted for: ${req.user.blacklisted.reason}`,
        });

        const toUpdate: any = {};

        for (const entry of Object.entries(req.body)) {
            if (entry[0] === 'randomDomain') {
                toUpdate['settings.randomDomain.enabled'] = entry[1];
            } else if (entry[0] === 'embed') {
                toUpdate['settings.embed.enabled'] = entry[1];
            } else {
                toUpdate[`settings.${entry[0]}`] = entry[1];
            }
        }

        await Users.updateOne({ _id: user._id }, toUpdate);

        res.status(200).json({
            success: true,
            message: 'updated settings successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.put('/@me/embed', JoiMiddleware(EmbedSchema, 'body'), async (req: Request, res: Response) => {
    let { user } = req;
    const { title, description, color, author, randomColor } = req.body;

    if (!user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    try {
        user = await Users.findOne({ _id: user._id });

        if (!user) return res.status(401).json({
            success: false,
            error: 'unauthorized',
        });

        if (!user.emailVerificationKey) return res.status(401).json({
            success: false,
            error: 'please verify your email',
        });

        if (user.blacklisted.status) return res.status(401).json({
            success: false,
            error: `you are blacklisted for: ${req.user.blacklisted.reason}`,
        });

        await Users.updateOne({ _id: user._id }, {
            settings: {
                ...user.settings,
                embed: {
                    ...user.settings.embed,
                    title,
                    description,
                    color,
                    author,
                    randomColor,
                },
            },
        });

        res.status(200).json({
            success: true,
            message: 'updated embed successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.post('/@me/disable', async (req: Request, res: Response) => {
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

    if (user.blacklisted.status) return res.status(401).json({
        success: false,
        error: `you are blacklisted for: ${req.user.blacklisted.reason}`,
    });

    try {
        await Users.updateOne({ _id: user._id }, {
            blacklisted: {
                status: true,
                reason: 'disabled account',
            },
        });

        res.clearCookie('jwt');

        res.status(200).json({
            success: true,
            message: 'disabled account successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.put('/testimonial', JoiMiddleware(TestimonialSchema, 'body'), async (req: Request, res: Response) => {
    const { testimonial }: { testimonial: string } = req.body;

    if (!req.user) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    if (req.user.blacklisted.status) return res.status(401).json({
        success: false,
        error: `you are blacklisted for: ${req.user.blacklisted.reason}`,
    });

    if (filter.isProfane(testimonial)) return res.status(400).json({
        success: false,
        error: 'your testimonial contains a blacklisted word',
    });

    await Users.updateOne({ _id: req.user._id }, {
        testimonial,
    }).then(() => {
        res.status(200).json({
            success: true,
            message: 'updated testimonial successfully',
        });
    }).catch((err) => {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    });
});

router.post('/:id/blacklist', AdminMiddleware, JoiMiddleware(BlacklistSchema, 'body'), async (req: Request, res: Response) => {
    const { id } = req.params;
    const reason = req.body.reason || 'No reason provided';

    if (!id) return res.status(400).json({
        success: false,
        error: 'provide a uid',
    });

    const user = await Users.findOne({ _id: id });

    if (!user) return res.status(404).json({
        success: false,
        error: 'invalid uid',
    });

    if (user.blacklisted.status) res.status(400).json({
        success: false,
        error: `this user is already blacklisted for: ${user.blacklisted.reason}`,
    });

    await Users.updateOne({ _id: id }, {
        blacklisted: {
            status: true,
            reason,
        },
    }).then(() => {
        res.status(200).json({
            success: true,
            message: 'blacklisted user successfully',
        });
    }).catch((err) => {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    });
});

router.post('/:id/whitelist', AdminMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) return res.status(400).json({
        success: false,
        error: 'provide a uid',
    });

    const user = await Users.findOne({ _id: id });

    if (!user) return res.status(404).json({
        success: false,
        error: 'invalid uid',
    });

    if (!user.blacklisted.status) res.status(400).json({
        success: false,
        error: 'the specified user is not blacklisted',
    });

    await Users.updateOne({ _id: id }, {
        blacklisted: {
            status: false,
            reason: null,
        },
    }).then(() => {
        res.status(200).json({
            success: true,
            message: 'whitelisted user successfully',
        });
    }).catch((err) => {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    });
});

router.get('/:id/images', async (req: Request, res: Response) => {
    let { user } = req;
    const { id } = req.params;
    const key = req.headers.authorization as string;

    if (!user && key !== process.env.API_KEY) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    if (!id) return res.status(400).json({
        success: false,
        error: 'provide a id',
    });

    user = await Users.findOne({ _id: id });

    if (!user) return res.status(404).json({
        success: false,
        error: 'invalid id',
    });

    if (key !== process.env.API_KEY && user._id !== req.user._id) return res.status(401).json({
        success: false,
        error: 'unauthorized',
    });

    const params = {
        Bucket: process.env.S3_BUCKET,
        Prefix: `${user._id}/`,
    };

    const objects = await s3.listObjectsV2(params).promise();
    objects.Contents.sort((a, b) => b.LastModified.getTime() - a.LastModified.getTime());

    const images = [];

    for (const object of objects.Contents) {
        images.push({
            link: `https://cdn.astral.cool/${user._id}/${object.Key.split('/')[1]}`,
            dateUploaded: object.LastModified.toLocaleDateString(),
            filename: object.Key.split('/')[1],
        });
    }

    res.status(200).json({
        success: true,
        images,
    });
});

router.get('/:id', AdminMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) return res.status(400).json({
        success: false,
        error: 'provide a uid',
    });

    let user = await Users.findOne({ _id: id });

    if (!user) return res.status(404).json({
        success: false,
        error: 'invalid user',
    });

    user = user.toObject();
    delete user.__v;
    delete user.password;

    res.status(200).json({
        success: true,
        user,
    });
});

export default router;
