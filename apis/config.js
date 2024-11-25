require('dotenv').config();

let authConfig = {
  verify_login: false,
  verify_signup: true,
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

module.exports = { configure, authConfig }; 