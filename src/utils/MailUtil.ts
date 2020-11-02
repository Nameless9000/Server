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
    <a href="${process.env.BACKEND_URL}/auth/verify?key=${user.emailVerificationKey}">Verify here.</a>`;

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

export {
    sendVerificationEmail
};
