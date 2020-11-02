import { Request, Response, Router } from 'express';
import AdminMiddleware from '../middlewares/AdminMiddleware';
import JoiMiddleware from '../middlewares/JoiMiddleware';
import Domains from '../models/DomainModel';
import DomainSchema from '../schemas/DomainSchema';
const router = Router();

router.get('/', async (req: Request, res: Response) => {
    await Domains.find({})
        .then((domains) => {
            for (let domain of domains) {
                domain = domain.toObject({
                    versionKey: false,
                });
            }
            res.status(200).json({
                success: true,
                domains,
            });
        });
});

router.post('/', AdminMiddleware, JoiMiddleware(DomainSchema, 'body'), async (req: Request, res: Response) => {
    const { name, wildcard, donated, donatedBy } = req.body;

    if (await Domains.findOne({ name })) return res.status(400).json({
        success: false,
        error: 'This domain alraedy exists.',
    });

    await Domains.create({
        name,
        wildcard,
        donated: donated ? donated : false,
        donatedBy: donatedBy ? donatedBy : 'N/A',
        dateAdded: new Date().toLocaleDateString(),
    }).then(() => {
        res.status(200).json({
            success: true,
            message: 'Added domain successfully.',
        });
    }).catch((err) => {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    });
});

router.delete('/:id', AdminMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) return res.status(500).json({
        success: false,
        error: 'Please provide a domain name.',
    });

    const domain = await Domains.findOne({ name: id });

    if (!domain) return res.status(404).json({
        success: false,
        error: 'Invalid domain.',
    });

    await domain.remove()
        .then(() => {
            res.status(202).json({
                success: true,
                message: 'Deleted domain successfully.',
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
        const total = await Domains.countDocuments();
        const donated = await Domains.countDocuments({ donated: true });
        res.status(200).json({
            success: true,
            total,
            donated,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

export default router;
