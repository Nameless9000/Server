import { Request, Response, Router } from 'express';
import ms from 'ms';
import ValidationMiddleware from '../../middlewares/ValidationMiddleware';
import DomainModel from '../../models/DomainModel';
import UserModel from '../../models/UserModel';
import EmbedSchema from '../../schemas/EmbedSchema';
import PreferencesSchema from '../../schemas/PreferencesSchema';
import RandomDomainSchema from '../../schemas/RandomDomainSchema';
import UpdateDomainSchema from '../../schemas/UpdateDomainSchema';
import WipeIntervalSchema from '../../schemas/WipeIntervalSchema';
import { delInterval, intervals } from '../../utils/Intervals';
import { wipeFiles } from '../../utils/S3Util';
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

        if (validDomain.userOnly && validDomain.donatedBy !== user._id) return res.status(400).json({
            success: false,
            error: 'you do not have permission to use this domain',
        });

        if (!validDomain.wildcard) subdomain = null;

        await UserModel.findByIdAndUpdate(user._id, {
            'settings.domain': {
                name: domain,
                subdomain: subdomain || null,
            },
        });

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
            switch (entry[0]) {
                case 'randomDomain':
                    toUpdate['settings.randomDomain.enabled'] = entry[1];
                    break;
                case 'autoWipe':
                    const findInterval = intervals.find((i) => i.uuid === user._id);

                    if (findInterval) {
                        clearInterval(findInterval.id);
                        delInterval(user._id);
                    }

                    if (entry[1] === true) {
                        const interval = setInterval(async () => {
                            await wipeFiles(user);
                        }, user.settings.autoWipe.interval);

                        intervals.push({
                            id: interval,
                            uuid: user._id,
                        });
                    }

                    toUpdate['settings.autoWipe.enabled'] = entry[1];
                    break;
                case 'embeds':
                    toUpdate['settings.embed.enabled'] = entry[1];
                    break;
                default:
                    toUpdate[`settings.${entry[0]}`] = entry[1];
                    break;
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

router.put('/wipe_interval', ValidationMiddleware(WipeIntervalSchema), async (req: Request, res: Response) => {
    const { value } = req.body;
    const { user } = req;

    try {
        const validIntervals = [ms('1m'), ms('1h'), ms('2h'), ms('12h'), ms('24h'), ms('1w'), ms('2w'), ms('4w')];

        if (!validIntervals.includes(value)) return res.status(400).json({
            success: false,
            error: 'invalid interval',
        });

        await UserModel.findByIdAndUpdate(user._id, {
            'settings.autoWipe.interval': value,
        });

        if (user.settings.autoWipe.enabled) {
            const findInterval = intervals.find((i) => i.uuid === user._id);

            if (findInterval) {
                clearInterval(findInterval.id);
                delInterval(user._id);
            }

            const interval = setInterval(async () => {
                await wipeFiles(user);
            }, value);

            intervals.push({
                id: interval,
                uuid: user._id,
            });
        }

        res.status(200).json({
            success: true,
            message: 'update interval successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

export default router;
