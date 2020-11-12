import Axios from 'axios';

class CloudflareError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CloudflareError';
    }
}

async function addDomain(domain: string) {
    try {
        const { data } = await Axios.post('https://api.cloudflare.com/client/v4/zones', {
            name: domain,
            account: {
                id: process.env.CLOUDFLARE_ACCOUNT_ID,
            },
        }, {
            headers: {
                'X-Auth-Key': process.env.CLOUDFLARE_API_KEY,
                'X-Auth-Email': process.env.CLOUDFLARE_EMAIL,
                'Content-Type': 'application/json',
            },
        });

        const id = data.result.id;

        await Axios.post(`https://api.cloudflare.com/client/v4/zones/${id}/dns_records`, {
            type: 'CNAME',
            name: '@',
            content: 'i.astral.cool',
            ttl: 1,
            proxied: true,
        }, {
            headers: {
                'X-Auth-Key': process.env.CLOUDFLARE_API_KEY,
                'X-Auth-Email': process.env.CLOUDFLARE_EMAIL,
                'Content-Type': 'application/json',
            },
        });

        await Axios.post(`https://api.cloudflare.com/client/v4/zones/${id}/dns_records`, {
            type: 'CNAME',
            name: '*',
            content: domain,
            ttl: 1,
        }, {
            headers: {
                'X-Auth-Key': process.env.CLOUDFLARE_API_KEY,
                'X-Auth-Email': process.env.CLOUDFLARE_EMAIL,
                'Content-Type': 'application/json',
            },
        });

        await Axios.patch(`https://api.cloudflare.com/client/v4/zones/${id}/settings/ssl`, {
            value: 'flexible',
        }, {
            headers: {
                'X-Auth-Key': process.env.CLOUDFLARE_API_KEY,
                'X-Auth-Email': process.env.CLOUDFLARE_EMAIL,
                'Content-Type': 'application/json',
            },
        });

        await Axios.patch(`https://api.cloudflare.com/client/v4/zones/${id}/settings/always_use_https`, {
            value: 'on',
        }, {
            headers: {
                'X-Auth-Key': process.env.CLOUDFLARE_API_KEY,
                'X-Auth-Email': process.env.CLOUDFLARE_EMAIL,
                'Content-Type': 'application/json',
            },
        });
    } catch (err) {
        throw new CloudflareError(err.response.data.errors[0].message);
    }
}

export {
    addDomain
};
