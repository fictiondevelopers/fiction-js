import dotenv from 'dotenv';

dotenv.config();

/**
 * Authentication configuration object
 * @property {boolean} verify_login - If true, requires OTP verification on each login
 * @property {boolean} verify_signup - If true, requires OTP verification on signup
 * @property {string} default_role - Default role assigned to new users
 * @property {number} otp_length - Length of generated OTP codes
 * @property {number} otp_expiry - Minutes until OTP codes expire
 * @property {Object} smtp - SMTP configuration for email OTP delivery
 * @property {Object} twilio - Twilio configuration for SMS OTP delivery
 */
let authConfig = {
  verify_login: false, // Enable OTP verification on login
  verify_signup: false,
  default_role: 'user',
  otp_length: parseInt(process.env.OTP_LENGTH) || 6,
  otp_expiry: parseInt(process.env.OTP_EXPIRY) || 5,
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
    secure: process.env.SMTP_SECURE === 'true'
  },
  twilio: {
    account_sid: process.env.TWILIO_ACCOUNT_SID,
    auth_token: process.env.TWILIO_AUTH_TOKEN,
    from_number: process.env.TWILIO_FROM_NUMBER
  }
};

const configure = (config) => {
  if (config.auth) {
    authConfig = {
      ...authConfig,
      ...config.auth
    };
  }
};

export { configure, authConfig };