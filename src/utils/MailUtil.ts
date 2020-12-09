import { createTransport } from 'nodemailer';
import { User } from '../models/UserModel';

const emailAddress = 'no-reply@astral.cool';
const serviceClient = process.env.GSUITE_CLIENT_ID;
const privateKey = ;

/**
 * The nodemailer transporter.
 */
const transporter = createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        type: 'OAuth2',
        user: emailAddress,
        serviceClient,
        privateKey,
    },
});

/**
 * Send the verification email to a user.
 * @param {User} user The user to send the email to.
 */
async function sendVerificationEmail(user: User) {
    try {
        const html = `<h1>Email Verification</h1>
        Thank you for registering on <a href="https://astral.cool">Astral</a>, <strong>${user.username}</strong>.<br>
        Please confirm your email with the link below to complete the registration process.<br><br>
        ${process.env.BACKEND_URL}/auth/verify?key=${user.emailVerificationKey}`;

        const email = {
            from: emailAddress,
            to: user.email,
            subject: 'Verify your Email',
            html,
        };

        await transporter.sendMail(email);
    } catch (err) {
        throw new Error(err);
    }
}

export {
    transporter,
    sendVerificationEmail
};

