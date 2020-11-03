/* eslint-disable camelcase */
import Axios from 'axios';
import { stringify } from 'querystring';
import { User } from '../models/UserModel';
import { AuthorizationInterface } from './interfaces/AuthorizationInterface';
import { DiscordUserInterface } from './interfaces/DiscordUserInterface';

class oAuth {
    authorization: AuthorizationInterface;
    user: DiscordUserInterface;
    code: string;

    constructor(code: string) {
        this.code = code;
    }

    /**
     * Check if a oauth code is valid.
     */
    async validCode(): Promise<boolean> {
        try {
            const { data } = await Axios.post('https://discord.com/api/oauth2/token', stringify({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                redirect_uri: process.env.DISCORD_REDIRECT_URI,
                grant_type: 'authorization_code',
                code: this.code,
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            this.authorization = data;
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Get a user.
     */
    async getUser(): Promise<DiscordUserInterface> {
        try {
            const { data } = await Axios.get('https://discord.com/api/users/@me', {
                headers: {
                    'Authorization': `Bearer ${this.authorization.access_token}`,
                },
            });

            this.user = data;
            return data;
        } catch (err) {
            return err;
        }
    }

    /**
     * Add a guild member to the server.
     * @param {User} user The user.
     */
    async addGuildMember(user: User): Promise<{ success: boolean; error?: string; }> {
        try {
            const data = JSON.stringify({
                'access_token': this.authorization.access_token,
                'roles': [process.env.DISCORD_WHITELISTED_ROLE],
            });

            await Axios.put(`https://discord.com/api/guilds/${process.env.DISCORD_SERVER_ID}/members/${this.user.id}`, data, {
                headers: {
                    'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Content-Length': data.length,
                },
            });

            const roleData = JSON.stringify({
                'access_token': this.authorization.access_token,
            });

            await Axios.put(`https://discord.com/api/guilds/${process.env.DISCORD_SERVER_ID}/members/${this.user.id}/roles/${process.env.DISCORD_WHITELISTED_ROLE}`, roleData, {
                headers: {
                    'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                },
            });

            if (user.discord.id !== null && user.discord.id !== this.user.id) {
                const guildMemberResponse = await Axios.get(`https://discord.com/api/guilds/${process.env.DISCORD_SERVER_ID}/members/${user.discord.id}`, {
                    headers: {
                        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (guildMemberResponse.data.roles.includes(process.env.DISCORD_WHITELISTED_ROLE)) {
                    await Axios.delete(`https://discord.com/api/guilds/${process.env.DISCORD_SERVER_ID}/members/${user.discord.id}/roles/${process.env.DISCORD_WHITELISTED_ROLE}`, {
                        headers: {
                            'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                            'Content-Type': 'application/json',
                        },
                    });
                }
            }

            return {
                success: true,
            };
        } catch (err) {
            return {
                success: false,
                error: err.message,
            };
        }
    }
}

export {
    oAuth
};
