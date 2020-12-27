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
        content: `<@&785697322617012235>\n\n${grammar} been added, DNS records have automatically been updated. \n\n\`\`\`${domainList}\`\`\``,
    });
};

/**
 * Log a single custom domain to the webhook in the server.
 * @param {Domain} domain The domain.
 */
async function logCustomDomain(domain: Domain) {
    await Axios.post(process.env.CUSTOM_DOMAIN_WEBHOOK, {
        embeds: [
            {
                title: 'A new domain has been added',
                fields: [
                    {
                        name: 'Name',
                        value: `[${domain.name}](https://${domain.name})`,
                    },
                    {
                        name: 'Wildcard',
                        value: domain.wildcard ? 'Yes' : 'No',
                    },
                    {
                        name: 'Donator',
                        value: domain.donatedBy,
                    },
                    {
                        name: 'User Only',
                        value: domain.userOnly ? 'Yes' : 'No',
                    },
                ],
            },
        ],
    });
}

export {
    logDomains,
    logCustomDomain
};
