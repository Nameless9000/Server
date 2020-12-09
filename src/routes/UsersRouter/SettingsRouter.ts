import { Request, Response, Router } from 'express';
import ValidationMiddleware from '../../middlewares/ValidationMiddleware';
import DomainModel from '../../models/DomainModel';
import UserModel from '../../models/UserModel';
import EmbedSchema from '../../schemas/EmbedSchema';
import PreferencesSchema from '../../schemas/PreferencesSchema';
import RandomDomainSchema from '../../schemas/RandomDomainSchema';
import UpdateDomainSchema from '../../schemas/UpdateDomainSchema';
const router = Router();

router.put('/domain', ValidationMiddleware(UpdateDomainSchema), async (req: Request, res: Response) => {
    const { user } = req;
    let { domain, subdomain } = req.body;

    try {
        const validDomain = await DomainModel.findOne({ name: domain });

        if (!validDomain) return res.status(400).json({
            success: false,
            error: 'invalid domain name',
        });

        if (!validDomain.wildcard) subdomain = null;

        await UserModel.findByIdAndUpdate(user._id, {
            'settings.domain': {
                name: domain,
                subdomain: subdomain || null,
            },
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.put('/random_domain', ValidationMiddleware(RandomDomainSchema), async (req: Request, res: Response) => {
    const { user } = req;
    const { domain } = req.body;
    const { domains } = user.settings.randomDomain;

    try {
        if (domains.find((d) => d === domain)) return res.status(400).json({
            success: false,
            error: 'you already have this domain added',
        });

        await UserModel.findByIdAndUpdate(user._id, {
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

router.delete('/random_domain', ValidationMiddleware(RandomDomainSchema), async (req: Request, res: Response) => {
    const { user } = req;
    const { domain } = req.body;
    const { domains } = user.settings.randomDomain;

    try {
        if (!domains.find((d) => d === domain)) return res.status(404).json({
            success: false,
            error: 'invalid domain',
        });

        await UserModel.findByIdAndUpdate(user._id, {
            'settings.randomDomain.domains': domains.filter((d) => d !== domain),
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

router.put('/preferences', ValidationMiddleware(PreferencesSchema), async (req: Request, res: Response) => {
    const { user } = req;

    try {
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

        await UserModel.findByIdAndUpdate(user._id, toUpdate);

        res.status(200).json({
            success: true,
            message: 'updated preferences successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

router.put('/embed', ValidationMiddleware(EmbedSchema), async (req: Request, res: Response) => {
    const { color, title, description, author, randomColor } = req.body;
    const { user } = req;

    try {
        await UserModel.findByIdAndUpdate(user._id, {
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

export default router;
