import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.CLIENT_URL ;

const emailTemplates = {
// Welcome & Email Verification with OTP
welcomeTemplate: (name, emailToken) => ({
  subject: 'Welcome to AgroMart - Verify Your Account',
  html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to AgroMart</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <h2 style="color: #2d572c; margin-top: 0;">Welcome to AgroMart, ${name}!</h2>
            <p>Thank you for joining Nigeria’s trusted agricultural marketplace.</p>
            
            <div style="background: #f8f9fa; padding: 20px; margin: 25px 0; text-align: center; border-radius: 4px; border: 1px dashed #ddd;">
                <p style="margin: 0 0 15px 0; color: #555;">Use the OTP code below to verify your account:</p>
                
                <div style="display: inline-block; background-color: #2d572c; color: #ffffff; padding: 15px 30px; 
                            font-size: 22px; border-radius: 5px; font-weight: bold; letter-spacing: 5px;">
                    ${emailToken}
                </div>

                <p style="margin: 20px 0 0 0; color: #777; font-size: 14px;">
                    This code will expire in 15 minutes.
                </p>
            </div>
            
            <p style="margin-top: 30px; font-size: 0.9em; color: #777; border-top: 1px solid #eee; padding-top: 20px;">
                If you didn’t request this verification, please ignore this email.<br><br>
                Thank you,<br>
                The AgroMart Team
            </p>
        </div>
    </body>
    </html>
  `
}),


  // Login Alert Template
  loginTemplate: (name, loginTime, ipAddress) => ({
    subject: 'AgroMart - New Login Detected',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Login Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 20px; 
                      border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2d572c;">Hello ${name},</h2>
              <p>We noticed a login to your AgroMart account.</p>
              <p><strong>Login Time:</strong> ${loginTime}</p>
              <p><strong>IP Address:</strong> ${ipAddress}</p>
              <p>If this was you, you can safely ignore this email.</p>
              <p>If you didn’t log in, please <a href="${BASE_URL}/reset-password" style="color: #2d572c; text-decoration: none;">reset your password</a> immediately and contact our support team.</p>
              <p style="margin-top: 20px; font-size: 0.9em; color: #555;">
                  Stay safe,<br>
                  The AgroMart Team
              </p>
          </div>
      </body>
      </html>
    `
  }),

  // Password Reset Template (Token-based)
passwordResetTemplate: (name, resetLink) => ({
  subject: 'AgroMart - Password Reset Request',
  html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - AgroMart</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
            <p>We received a request to reset your AgroMart account password.</p>
            
            <div style="background: #f8f9fa; padding: 20px; margin: 25px 0; text-align: center; border-radius: 4px; border: 1px dashed #ddd;">
                <p style="margin: 0 0 15px 0; color: #555;">Click the button below to reset your password:</p>
                <a href="${resetLink}" 
                   style="font-size: 16px; font-weight: bold; background: #28a745; color: #fff; 
                          padding: 12px 24px; border-radius: 5px; text-decoration: none; display:inline-block;">
                    Reset Password
                </a>
                <p style="margin: 15px 0 0 0; color: #777; font-size: 14px;">
                    This link will expire in 1 hour.
                </p>
            </div>
            
            <p>If you did not request a password reset, you can safely ignore this email.</p>
            
            <p style="margin-top: 30px; font-size: 0.9em; color: #777; border-top: 1px solid #eee; padding-top: 20px;">
                Thank you,<br>
                The AgroMart Team
            </p>
        </div>
    </body>
    </html>
  `
}),

  // Password Reset Success Template
  passwordResetSuccessTemplate: (name) => ({
    subject: 'AgroMart - Password Successfully Reset',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Successful - AgroMart</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2d572c; margin-top: 0;">Hello ${name},</h2>
              <p>Your password has been successfully reset.</p>
              <p>If this was not you, please contact our support team immediately to secure your account.</p>
              <p style="margin-top: 30px; font-size: 0.9em; color: #777; border-top: 1px solid #eee; padding-top: 20px;">
                  Stay safe,<br>
                  The AgroMart Team
              </p>
          </div>
      </body>
      </html>
    `
  }),

  // Order Confirmation Template
  orderConfirmationTemplate: (name, orderId) => ({
    subject: 'AgroMart - Your Order Has Been Placed',
    html: `
      <html>
        <body>
          <p>Hi ${name},</p>
          <p>Your order with ID <strong>${orderId}</strong> has been successfully placed and payment is secured in escrow.</p>
          <p>You can view your order details here:</p>
          <a href="${BASE_URL}/orders/${orderId}" 
             style="display:inline-block;padding:10px 20px;background:#2d572c;color:#fff;border-radius:5px;text-decoration:none;">
            View Order
          </a>
        </body>
      </html>
    `
  }),

  // Escrow Release Notification
  escrowReleaseTemplate: (name, escrowId) => ({
    subject: 'AgroMart - Escrow Funds Released',
    html: `
      <html>
        <body>
          <p>Hi ${name},</p>
          <p>The funds for your escrow ID <strong>${escrowId}</strong> have been released to your AgroMart wallet.</p>
          <p>You can view the transaction here:</p>
          <a href="${BASE_URL}/escrow/${escrowId}" 
             style="display:inline-block;padding:10px 20px;background:#ffc107;color:#000;border-radius:5px;text-decoration:none;">
            View Escrow
          </a>
        </body>
      </html>
    `
  })
};

export default emailTemplates;
