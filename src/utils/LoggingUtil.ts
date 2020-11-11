import Axios from 'axios';
import { Domain } from '../models/DomainModel';

/**
 * Log a new domain to the domain notifications channel.
 * @param {Domain} domain The domain that was inserted.
 */
async function logDomain(domain: Domain) {
    await Axios.post(process.env.WEBHOOK_URL, {
        content: `A new domain has been added.\n\n\`${domain.name}\``,
    });
};

export {
    logDomain
};
