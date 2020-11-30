import { S3 } from 'aws-sdk';
import { User } from '../models/UserModel';

/**
 * The aws-S3 session.
 */
const s3 = new S3({
    credentials: {
        secretAccessKey: process.env.S3_SECRET_KEY,
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
    },
    endpoint: process.env.S3_ENDPOINT,
});

/**
 * Wipe a user's files.
 * @param {user} user The user's files to wipe.
 */
async function wipeFiles(user: User) {
    const params = {
        Bucket: process.env.S3_BUCKET,
        Prefix: `${user._id}/`,
    };

    const deleteParams = {
        Bucket: process.env.S3_BUCKET,
        Delete: {
            Objects: [],
        },
    };

    const objects = await s3.listObjectsV2(params).promise();

    if (objects.Contents.length !== 0) {
        for (const { Key } of objects.Contents) {
            deleteParams.Delete.Objects.push({ Key });
        }

        await s3.deleteObjects(deleteParams).promise();

        if (objects.IsTruncated) await wipeFiles(user);
    }
}

export {
    s3,
    wipeFiles
};
