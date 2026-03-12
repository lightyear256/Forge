import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  resetCode: string,
) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
          <h1>Password Reset Request</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9fafb; border-radius: 10px; margin-top: 20px;">
          <p style="color: #374151; font-size: 16px;">Hi,</p>
          <p style="color: #374151; font-size: 16px;">We received a request to reset your password. Use the code below to proceed:</p>
          
          <div style="background-color: white; border: 2px solid #7c3aed; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">Reset Code</p>
            <p style="color: #7c3aed; font-size: 32px; font-weight: bold; margin: 10px 0; font-family: monospace; letter-spacing: 4px;">${resetCode}</p>
          </div>
          
          <p style="color: #374151; font-size: 14px;">Or click the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Reset Password</a>
          </div>
          
          <p style="color: #6b7280; font-size: 12px;">This link expires in 15 minutes.</p>
          <p style="color: #ef4444; font-size: 12px; margin-top: 10px;">If you didn't request this, please ignore this email.</p>
        </div>
        
        <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p>&copy; 2026 Code Editor. All rights reserved.</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request - Code Editor",
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: "Reset email sent successfully" };
  } catch (error) {
    console.error("Send email error:", error);
    throw new Error("Failed to send reset email");
  }
};

export const sendWelcomeEmail = async (name: string, email: string) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
          <h1>Welcome to Code Editor!</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9fafb; border-radius: 10px; margin-top: 20px;">
          <p style="color: #374151; font-size: 16px;">Hi ${name},</p>
          <p style="color: #374151; font-size: 16px;">Welcome to our online code editor! We're excited to have you on board.</p>
          
          <p style="color: #374151; font-size: 16px; margin-top: 20px;">You can now:</p>
          <ul style="color: #374151; font-size: 16px;">
            <li>Create and manage your coding projects</li>
            <li>Run code in multiple languages and environments</li>
            <li>Monitor your application performance</li>
            <li>Collaborate with other developers</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Go to Dashboard</a>
          </div>
        </div>
        
        <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p>&copy; 2026 Code Editor. All rights reserved.</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to Code Editor - Get Started!",
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: "Welcome email sent successfully" };
  } catch (error) {
    console.error("Send welcome email error:", error);
    throw new Error("Failed to send welcome email");
  }
};
