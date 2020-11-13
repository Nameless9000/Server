import sgMail from '@sendgrid/mail';
import { User } from '../models/UserModel';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send a verification email to a user.
 * @param {User} user The user to send the email to.
 */
async function sendVerificationEmail(user: User) {
    const html = `<h1>Email Verification</h1>
    Thank you for registering on <a href="https://astral.cool">Astral</a>, ${user.username}.<br>
    Please confirm your email with the link below to get started.<br><br>
    <a href="${process.env.BACKEND_URL}/auth/verify?key=${user.emailVerificationKey}">Verify here</a>`;

    const msg = {
        to: user.email,
        from: 'admin@astral.cool',
        subject: 'Astral Verification',
        html,
    };

    sgMail.send(msg)
        .catch((err) => {
            return err;
        });
}

async function sendPasswordReset(user: User, key: String) {
    const html = `<h1>Password Reset</h1>
    Hello ${user.username}, you have requested to reset your password, if you did not do this, please contact an admin.<br>
    Please click on the link below to continue the reset proccess.
    <a href="${process.env.FRONTEND_URL}/resetpassword?key=${key}">Reset your password</a>`;

    const msg = {
        to: user.email,
        from: 'admin@astral.cool',
        subject: 'Password Reset',
        html,
    };

    sgMail.send(msg)
        .catch((err) => {
            return err;
        });
}

export {
    sendVerificationEmail,
    sendPasswordReset
};
