import { S3 } from 'aws-sdk';

const s3 = new S3({
    credentials: {
        secretAccessKey: process.env.S3_SECRET_KEY,
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
    },
    endpoint: process.env.S3_ENDPOINT,
});

export {
    s3
};
