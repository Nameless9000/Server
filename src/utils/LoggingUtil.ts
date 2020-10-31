import Axios from 'axios';
import { File } from '../models/FileModel';
import { User } from '../models/UserModel';

/**
 * Log a file.
 * @param {File} file The uploaded file.
 * @param {User} user The user who uploaded the file.
 */
async function logFile(file: File, user: User) {
    await Axios.post(process.env.WEBHOOK_URL, {
        embeds: [
            {
                url: `https://cdn.astral.cool/${user._id}/${file.filename}`,
                title: file.filename,
                thumbnail: {
                    url: `https://cdn.astral.cool/${user._id}/${file.filename}`,
                },
                fields: [
                    {
                        name: 'User',
                        value: user.discord.id !== null ? `<@${user.discord.id}>` : `\`${user.username}\``,
                        inline: true,
                    },
                    {
                        name: 'Delete File',
                        value: `[Click here](${process.env.BACKEND_URL}/files/delete?key=${file.deletionKey})`,
                        inline: true,
                    },
                ],
            },
        ],
    });
};


export {
    logFile
};
