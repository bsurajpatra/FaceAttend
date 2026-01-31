import nodemailer from 'nodemailer';
import { env } from '../config/env';

/**
 * Creates a centralized nodemailer transporter with robust Gmail settings.
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465, // Use 465 for SSL
    secure: true,
    auth: {
      user: env.emailUser,
      pass: env.emailPass,
    },
    tls: {
      // Do not fail on invalid certs
      rejectUnauthorized: false
    }
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const transporter = createTransporter();
  const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"FaceAttend Security" <${env.emailUser}>`,
    to: email,
    subject: 'Password Reset Request - FaceAttend',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 1rem;">
        <h2 style="color: #1e293b; font-size: 24px; font-weight: 800; text-transform: uppercase; font-style: italic;">FaceAttend Recovery</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 1.5;">You are receiving this email because you (or someone else) have requested the reset of the password for your account.</p>
        <p style="color: #64748b; font-size: 16px; line-height: 1.5;">Please click on the button below to complete the process:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; font-weight: 900; border-radius: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #64748b; font-size: 14px; border-top: 1px solid #f1f5f9; padding-top: 20px;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">SafeAttend Security Protocols Active • IP Tracing Enabled</p>
      </div>
    `,
  };

  try {
    console.log(`Attempting to send Password Reset Email to: ${email}`);
    await transporter.sendMail(mailOptions);
    console.log(`Password Reset Email sent successfully to: ${email}`);
  } catch (error) {
    console.error(`FAILED to send Password Reset Email to ${email}:`, error);
    throw error;
  }
}

export async function sendPasswordResetSuccessEmail(email: string): Promise<void> {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"FaceAttend Security" <${env.emailUser}>`,
    to: email,
    subject: 'Password Recovery Successful - FaceAttend',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 1rem;">
        <h2 style="color: #1e293b; font-size: 24px; font-weight: 800; text-transform: uppercase; font-style: italic;">FaceAttend Security</h2>
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0;">
          <p style="color: #166534; font-weight: bold; margin: 0;">Password Reset Successful</p>
        </div>
        <p style="color: #64748b; font-size: 16px; line-height: 1.5;">This is a confirmation that the password for your account has just been changed.</p>
        <p style="color: #64748b; font-size: 16px; line-height: 1.5;">If you did not make this change, please contact our security team immediately at support@faceattend.com.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${env.clientUrl}/login" style="background-color: #0f172a; color: white; padding: 14px 28px; text-decoration: none; font-weight: 900; border-radius: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block;">Go to Login</a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 20px;">SafeAttend Security Protocols Active • Account Monitored</p>
      </div>
    `,
  };

  try {
    console.log(`Attempting to send Password Success Email to: ${email}`);
    await transporter.sendMail(mailOptions);
    console.log(`Password Success Email sent successfully to: ${email}`);
  } catch (error) {
    console.error(`FAILED to send Password Success Email to ${email}:`, error);
    throw error;
  }
}

export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"FaceAttend Verification" <${env.emailUser}>`,
    to: email,
    subject: `${otp} is your FaceAttend verification code`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 1rem;">
        <h2 style="color: #1e293b; font-size: 24px; font-weight: 800; text-transform: uppercase; font-style: italic;">Verify Your Account</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 1.5;">Thank you for joining FaceAttend. Please use the following One-Time Password (OTP) to verify your email address. This code will expire in 10 minutes.</p>
        <div style="text-align: center; margin: 40px 0;">
          <div style="display: inline-block; background-color: #f1f5f9; color: #0f172a; padding: 20px 40px; border-radius: 16px; font-size: 32px; font-weight: 900; letter-spacing: 0.5em; border: 2px solid #e2e8f0;">
            ${otp}
          </div>
        </div>
        <p style="color: #64748b; font-size: 14px; border-top: 1px solid #f1f5f9; padding-top: 20px;">If you did not request this code, you can safely ignore this email.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">SafeAttend Verification System • Secure Enrolled</p>
      </div>
    `,
  };

  try {
    console.log(`Attempting to send OTP Email to: ${email}`);
    await transporter.sendMail(mailOptions);
    console.log(`OTP Email sent successfully to: ${email}`);
  } catch (error) {
    console.error(`FAILED to send OTP Email to ${email}:`, error);
    throw error;
  }
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"FaceAttend Team" <${env.emailUser}>`,
    to: email,
    subject: `Welcome to FaceAttend, ${name}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 1rem;">
        <h1 style="color: #1e293b; font-size: 28px; font-weight: 900; tracking-tight; mb-6 italic;">Welcome to the Future, <span style="color: #2563eb;">${name}</span>!</h1>
        
        <p style="color: #64748b; font-size: 16px; line-height: 1.6;">Your account is now fully verified and active. We're thrilled to have you join the FaceAttend faculty network.</p>
        
        <div style="background-color: #f8fafc; border-radius: 16px; padding: 24px; margin: 30px 0; border: 1px solid #e2e8f0;">
          <h3 style="color: #0f172a; margin-top: 0; font-weight: 800;">What's Next?</h3>
          <ul style="color: #64748b; padding-left: 20px; font-size: 15px;">
            <li style="margin-bottom: 10px;"><b>Setup your Timetable:</b> Organize your sessions in the ERP Console.</li>
            <li style="margin-bottom: 10px;"><b>Register Students:</b> Add class rosters with biometric photo capture.</li>
            <li style="margin-bottom: 1px;"><b>Enable Device Trust:</b> Secure your hardware for biometric authentication.</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="${env.clientUrl}/dashboard" style="background-color: #2563eb; color: white; padding: 16px 32px; text-decoration: none; font-weight: 900; border-radius: 16px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2);">Enter ERP Dashboard</a>
        </div>

        <p style="color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center;">
          SafeAttend Enterprise • Biometric Identity Management • ${new Date().getFullYear()}
        </p>
      </div>
    `,
  };

  try {
    console.log(`Attempting to send Welcome Email to: ${email}`);
    await transporter.sendMail(mailOptions);
    console.log(`Welcome Email sent successfully to: ${email}`);
  } catch (error) {
    console.error(`FAILED to send Welcome Email to ${email}:`, error);
    throw error;
  }
}

export async function send2FAEmail(email: string, otp: string): Promise<void> {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"FaceAttend Security" <${env.emailUser}>`,
    to: email,
    subject: `${otp} is your 2FA security code`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 1rem;">
        <h2 style="color: #1e293b; font-size: 24px; font-weight: 800; text-transform: uppercase; font-style: italic; margin-bottom: 20px;">Two-Factor Authentication</h2>
        
        <p style="color: #64748b; font-size: 16px; line-height: 1.5;">A login attempt was made for your FaceAttend account. Please use the following security code to complete your login:</p>
        
        <div style="text-align: center; margin: 40px 0;">
          <div style="display: inline-block; background-color: #f8fafc; color: #1e293b; padding: 20px 40px; border-radius: 16px; font-size: 36px; font-weight: 900; letter-spacing: 0.5em; border: 2px solid #3b82f6;">
            ${otp}
          </div>
        </div>

        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 20px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;"><b>Security Note:</b> If you did not attempt to log in, please change your password immediately and contact security.</p>
        </div>

        <p style="color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
          FaceAttend Multi-Factor Security System • Automated Protection Active
        </p>
      </div>
    `,
  };

  try {
    console.log(`Attempting to send 2FA Email to: ${email}`);
    await transporter.sendMail(mailOptions);
    console.log(`2FA Email sent successfully to: ${email}`);
  } catch (error) {
    console.error(`FAILED to send 2FA Email to ${email}:`, error);
    throw error;
  }
}
