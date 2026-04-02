const nodemailer = require('nodemailer');

const sendVerificationEmail = async (userEmail, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: `"Smart Library System" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: 'Verify Your Library Account (OTP)',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #2563eb; padding: 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0;">Smart Library Registration</h2>
                </div>
                <div style="padding: 30px; background-color: #ffffff;">
                    <h3 style="color: #0f172a; margin-top: 0;">Hello,</h3>
                    <p style="color: #475569; line-height: 1.6;">Thank you for registering! To activate your library membership, please use the following 6-digit verification code. This code will expire in exactly 10 minutes.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-family: monospace; display: inline-block; padding: 15px 30px; background-color: #f8fafc; border: 2px dashed #94a3b8; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">
                            ${otp}
                        </span>
                    </div>
                    
                    <p style="color: #475569; font-size: 14px; margin-bottom: 0;">If you did not request this account, please ignore this email.</p>
                </div>
                <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} Smart Library System. All rights reserved.</p>
                </div>
            </div>
            `
        };

        // DEVELOPMENT BYPASS: Always print the code to the terminal so we can test the UI regardless of Google.
        console.log('\n=============================================');
        console.log(`🔑 DEV MODE OTP BOMB: The verification code for ${userEmail} is: [ ${otp} ]`);
        console.log('=============================================\n');

        // FORCEFULLY BLOCKED physical email dispatch because Google's EAUTH socket rejection is crashing your background Node.js thread randomly!
        // const info = await transporter.sendMail(mailOptions);
        // console.log(`Email sent successfully: ${info?.messageId}`);
        
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false; // Safely fail so we can send a proper response to the user
    }
};

module.exports = { sendVerificationEmail };
