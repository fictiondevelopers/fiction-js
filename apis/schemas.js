const Joi = require('joi');

// Default values for validation
const DEFAULTS = {
  PASSWORD_MIN_LENGTH: 8,
  OTP_LENGTH: 6
};

// Helper function to safely parse environment variables
const getEnvInt = (key, defaultValue) => {
  const value = process.env[key];
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const authSchemas = {
  signup: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(getEnvInt('PASSWORD_MIN_LENGTH', DEFAULTS.PASSWORD_MIN_LENGTH))
      .required(),
    otp_method: Joi.string().valid('email', 'phone').default('email')
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    otp_method: Joi.string().valid('email', 'phone').default('email')
  }),

  verify: Joi.object({
    user_id: Joi.number().required(),
    code: Joi.string()
      .length(getEnvInt('OTP_LENGTH', DEFAULTS.OTP_LENGTH))
      .required(),
    type: Joi.string().valid('signup', 'login', 'reset').required()
  }),

  refresh: Joi.object({
    refreshToken: Joi.string().required()
  }),

  requestReset: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    user_id: Joi.number().required(),
    code: Joi.string()
      .length(getEnvInt('OTP_LENGTH', DEFAULTS.OTP_LENGTH))
      .required(),
    new_password: Joi.string()
      .min(getEnvInt('PASSWORD_MIN_LENGTH', DEFAULTS.PASSWORD_MIN_LENGTH))
      .required()
  })
};

module.exports = { authSchemas }; 