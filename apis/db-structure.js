import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Define custom parameters for field attributes
const fieldAttributes = {
  unique: Symbol('unique'),
  index: Symbol('index'),
  relation: Symbol('relation')
};



// Define your schemas using Extended Joi
const schemasDB = {
  models: {
    users: Joi.object({
      id: Joi.number().integer(),
      first_name: Joi.string(),
      last_name: Joi.string(),
      social_id: Joi.string(),
      type: Joi.string(),
      picture_url: Joi.string(),
      email: Joi.string().email().required().external(async (value, helpers) => {
        console.log('Checking if email already exists:', value);
        const existingUser = await prisma.users.findFirst({ where: { email: value } });
        if (existingUser) {
          throw new Error('Email address is already registered');
        }
        return value;
      }),
      username: Joi.string().external(async (value, helpers) => {
        const existingUser = await prisma.users.findFirst({ where: { username: value } });
        if (existingUser) {
          return helpers.message('Username is already taken');
        }
        return value;
      }),
      password: Joi.string()
        .min(6)
        .pattern(new RegExp('^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{6,}$'))
        .required()
        .error(new Error('Password must be at least 6 characters long and include both letters and numbers')),
      role: Joi.string().default('user'),
      verified: Joi.boolean().default(false),
      verified_at: Joi.date(),
      login_attempts: Joi.number().integer().default(0),
      locked_until: Joi.date(),
      last_login: Joi.date(),
      is_deleted: Joi.boolean().default(false),
      created_at: Joi.date().default('now').required(),
      updated_at: Joi.date().required(),
      otp_method: Joi.string().default('email')
    }),
    
    otp_codes: Joi.object({
      id: Joi.number().integer().required(),
      user_id: Joi.number().integer().required(),
      code: Joi.string().required(),
      type: Joi.string().required(),
      method: Joi.string().required(),
      used: Joi.boolean().default(false),
      expires_at: Joi.date().required(),
      created_at: Joi.date().default('now').required(),
      updated_at: Joi.date().default('now').required(),
      otp_method: Joi.string().default('email')
    }),
    
    products: Joi.object({
      id: Joi.number().integer().required(),
      name: Joi.string().required(),
      sku: Joi.string().required(),
      price: Joi.number().required(),
      description: Joi.string(),
      user_id: Joi.number().integer(),
      created_at: Joi.date().default('now').required()
    })
  }
};

export { schemasDB, fieldAttributes };
