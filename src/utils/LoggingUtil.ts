import Axios from 'axios';
import { Domain } from '../models/DomainModel';

/**
 * Log a list of new domains to the domain notifications channel.
 * @param {Domain[]} domains The domain that was created.
 */
async function logDomains(domains: Domain[]) {
    const grammar = domains.length > 1 ? `**${domains.length}** new domains have` : 'A new domain has';
    const domainList = domains.map((d) => (d.wildcard ? '*.' : '') + d.name).join(',\n');

    await Axios.post(process.env.WEBHOOK_URL, {
        content: `${grammar} been added, DNS records have automatically been updated. \n\n\`\`\`${domainList}\`\`\``,
    });
};

export {
    logDomains
};
