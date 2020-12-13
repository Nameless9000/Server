import { createTransport } from 'nodemailer';
import { User } from '../models/UserModel';

const emailAddress = 'no-reply@astral.cool';
const serviceClient = process.env.GSUITE_CLIENT_ID;
const privateKey = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCr3bh/x3g7lusj\nILv+4m/s8npfihN+aijtL0DGafkJ/0lUh+OiawddTR0TgwufIngBs47zTwYnb1bo\nNShW//Vz287WJH9VjIe/xJ9uICsPTq3rs001vMt0IcvTAn0wBWa8fN7NwRcTtKAu\n6tauRcih2yv9ywl5ceG51LAqCWr+OR+iMm+gTmQVLZz5Qzl+FXF48ITvzgcGH9p0\n9qENbesAQ7q3ULy8q2KSoFKdcnhnWABhz8l4HJPErg+W07ndYD3Qphd4qW9jVRpi\n7Wq5NvB3jejW0w7ftg1sZb4DKnVAlBIDor4toHRXFnlshIcPx48C4gV/eSA03jYN\nLWzUUznXAgMBAAECggEAFki53uuMpeFUHKpmZc6TZ5wrDM845te59cL+OZvM/CRb\nLDgwZkNNYaYZgomnzJrqB4JyIw8Yg612jcYytFEc0Mhr4a06y2tcwJssdtl569Ku\nT1TgynpvwN+O742vkLXqk773HqOOK/JsIJk3e8I1mPLzmcUlNddzxqYSr2ioNE0a\nGzJNVtWh6kexKRm0k89OKMOVJeW0VmKQ9Zd0jyy1bh5mbbsy5Xr9Nuno6iWaqfvt\nT9eWdTiukUMWrnD7UNSEN3NPDPFW1/Fcd9yCoqOlh1Jhl4qj9knrsI1rH7W0Ocb7\n0T02pk9ScCWyO+COfo1iJ1w5ZyIRKRPbhmdFWsVbBQKBgQDp0Wyk6BiDnSxktsv2\n8v4rbGyujOV7RBNfIiJywToWX11LgeCmtrbOYMVhoFFbr/klkWL+D8zAR45bMSLG\n756y4XJrseFdIg/UsQYGqWXJ1x8/5KahhltUCVrpU67BPcuRZCtv3UMrts6XN9Vl\nvPbZhuJfBcEosPXuoJufloD48wKBgQC8K7ZV/YRwciwL392nknXbUtpkv/GIGE3J\nHtkd9xZF+DoYI6EVPA0NAUXCk8LlsARUqvNcUlxGVSvgoxljyc4ao4nRVi/g7etg\nnw91j49Zey79e7ljkzsfQq7k+uUiANlLjGFFj7yBkO1jHWrtePWISYpYRXcQxaC1\n3CoNppR0jQKBgQC67laIpJHsrzytrEL2xKAVwVJGXpic6vj9xsF5syeoeUeSNVyQ\njGUsK8vB2DUTM2Xh9hEJg0Izu0GBgJAIMcxTwNAEb6r4FWJIrdpeexHIw3bVUw0w\n98SONAh9oAyHq8rTCx17Co9IJJeX5+hwtRk5IZBbXbNmv8tuovKoLOAhpwKBgFLT\nbtPU3mncZ3Tmmhs7hXL/ui+kqTz9bae8U1c0PnKX+4JKlInTP+9cgwdNoPkXDCD0\nimA1xHYU4VZklDVvS7BAEda5+CMqtnN2MAjQIwoBBcL/pa+ly91Lrc4OfbME6qCt\nbtd+mDvzvfnlpf5XQsQ1kpaeJPWV99J00XHmw+u1AoGBAJfVxgebnPfB79jhOGIT\nAsuVa387tUOf5zckYLfk2bZxz7P6yD+c8jsev+y6e+pzZRLifT1JWG28LHYSacMk\n5Ifjw9f0fax/PRIVveUgLpqr7sfLPKW6dZu8H5GG7QiRItqyX6pnZVo3H7KOxABB\n5hk616p0Yf6uSnYF6jwXQ4N2\n-----END PRIVATE KEY-----\n';

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

/**
 * Send a password reset to someone.
 * @param {User} user The user to send a reset email to.
 * @param {string} key The password reset key.
 */
async function sendPasswordReset(user: User, key: string) {
    const html = `<h1>Password Reset</h1>
    Hello <strong>${user.username}</strong>, you have requested to reset your password, if you did not request this change, please contact an Admin.<br>
    Please click on the link below to continue the reset process, this link will expire in <strong>10 minutes</strong>.<br>
    <a href="${process.env.FRONTEND_URL}/resetpassword?key=${key}">Reset your password</a>`;

    const email = {
        from: emailAddress,
        to: user.email,
        subject: 'Password Reset',
        html,
    };

    await transporter.sendMail(email);
}

export {
    transporter,
    sendVerificationEmail,
    sendPasswordReset
};

