
import emailTemplates from './emailTemplate.js';
import { sendEmail } from '../config/email.js';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.CLIENT_URL;

// Helper function to send verification email
export const sendVerificationEmail = async (email, emailToken, name = 'there') => {
    try {
        const verifyLink = `${BASE_URL}/verify-email?token=${emailToken}`;
        const verificationTemplate = emailTemplates.welcomeTemplate(name, verifyLink);
       
        await sendEmail(
            email,
            verificationTemplate.subject,
            verificationTemplate.html,
            // `Your verification code is: ${verifyLink}. Click the link to verify your account.`
        );
    } catch (error) {
        console.log(error);
        throw new Error('Failed to send verification email');
    }
};

// Helper function to send password reset email (TOKEN-based)
export const sendPasswordResetEmail = async (email, token, name = 'there') => {
    try {
        const resetLink = `${BASE_URL}/reset-password?token=${token}`;
        const resetTemplate = emailTemplates.passwordResetTemplate(name, resetLink);
        
        await sendEmail(
            email,
            resetTemplate.subject,
            resetTemplate.html,
            `Click this link to reset your password: ${resetLink}`
        );
    } catch (error) {
        console.log(error);
        throw new Error('Failed to send password reset email');
    }
};

// Password reset success email
export const sendPasswordResetSuccessEmail = async (email, name = 'there') => {
    try {
        const successTemplate = emailTemplates.passwordResetSuccessTemplate(name);
        
        await sendEmail(
            email,
            successTemplate.subject,
            successTemplate.html,
            `Your password has been successfully reset. If you did not perform this action, please contact support immediately.`
        );
    } catch (error) {
        console.log(error);
        throw new Error('Failed to send password reset success email');
    }
};
