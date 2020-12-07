import Axios, { Method } from 'axios';
import { AuthorizationInterface } from './interfaces/AuthorizationInterface';
import { DiscordUserInterface } from './interfaces/DiscordUserInterface';
import { stringify } from 'querystring';

export class OAuth {
    /**
     * The user's access token & refresh token.
     */
    authorization: AuthorizationInterface;

    /**
     * The user's basic information.
     */
    user: DiscordUserInterface;

    /**
     * The OAuth2 grant code.
     */
    code: string;

    constructor(code: string) {
        this.code = code;
    }

    /**
     * Send a request to the discord api.
     * @param {string} endpoint The endpoint to send a request to.
     * @param {Method} method The request method.
     * @param {object} body The request body.
     * @param {object} headers The request headers.
     */
    request = async (endpoint: string, method: Method, body?: object | string, headers?: object): Promise<any> => {
        try {
            const baseUrl = 'https://discord.com/api';
            const { data } = await Axios({
                url: `${baseUrl}${endpoint}`,
                method,
                headers: headers ? headers: null,
                data: body ? body : null,
            });

            return data;
        } catch (err) {
            throw new Error(err.response.data.error_description);
        }
    }

    /**
     * Verify that an OAuth grant code is valid.
     * @param {string} request The request type, defaults to login.
     */
    validate = async (request: string = 'login'): Promise<void> => {
        this.authorization = await this.request('/oauth2/token', 'POST', stringify({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            redirect_uri: request !== 'login' ? process.env.DISCORD_LINK_REDIRECT_URI : process.env.DISCORD_LOGIN_REDIRECT_URI,
            grant_type: 'authorization_code',
            code: this.code,
        }), {
            'Content-Type': 'application/x-www-form-urlencoded',
        });
    }

    /**
     * Get a user's basic information.
     * @return {DiscordUserInterface} The user's info.
     */
    getUser = async (): Promise<DiscordUserInterface> => {
        this.user = await this.request('/users/@me', 'GET', null, {
            'Authorization': `Bearer ${this.authorization.access_token}`,
        });

        return this.user;
    }
}
