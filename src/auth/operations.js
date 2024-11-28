import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { authConfig } from '../../apis/config.js';
import validateModel from '../core/validation.js';


const generateOTP = (length = 6) => {
  return Math.random().toString().substr(2, length);
};

const sendOTP = async (user, code, method, prisma) => {
  if (method === 'email') {
    const smtpConfig = {
      host: authConfig.smtp.host,
      port: authConfig.smtp.port,
      secure: true,
      auth: {
        user: authConfig.smtp.user,
        pass: authConfig.smtp.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    console.log(smtpConfig);
    const transporter = nodemailer.createTransport(smtpConfig);

    try {
      await transporter.sendMail({
        from: authConfig.smtp.from,
        to: user.email,
        subject: 'Verification Code',
        text: `Your verification code is: ${code}`
      });
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send verification email');
    }
  } else if (method === 'phone') {
    const client = twilio(authConfig.twilio.account_sid, authConfig.twilio.auth_token);
    await client.messages.create({
      body: `Your verification code is: ${code}`,
      from: authConfig.twilio.from_number,
      to: user.phone
    });
  }
};

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.TOKEN_EXPIRY }
  );
  
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
  
  return { accessToken, refreshToken };
};

const createAuthResponse = (user, tokens) => {
  const { password, ...userWithoutPassword } = user;
  return {
    success: true,
    res: {
      user: userWithoutPassword,
      ...tokens
    }
  };
};

const authOperations = {
  signup: async (prisma, data) => {
    try {
      const validatedData = await validateModel('users', data, [
        'email',
        'password',
        'otp_method'
      ]);
      
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      const userData = {
        ...validatedData,
        password: hashedPassword,
        role: authConfig.default_role || 'user',
        login_attempts: 0,
        last_login: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
        verified: !authConfig.verify_signup,
        type: 'email'
      };

      const user = await prisma.users.create({
        data: userData
      });

      if (authConfig.verify_signup) {
        const code = generateOTP(authConfig.otp_length);
        const method = data.otp_method || 'email';

        await prisma.otp_codes.create({
          data: {
            user_id: user.id,
            code,
            type: 'signup',
            method,
            used: false,
            
            expires_at: new Date(Date.now() + authConfig.otp_expiry * 60000),
            created_at: new Date(),
            updated_at: new Date()
          }
        });

        await sendOTP(user, code, method, prisma);

        return {
          success: true,
          res: {
            message: `Verification code sent to your ${method}`,
            user_id: user.id,
            requires_verification: true
          }
        };
      }

      const tokens = generateTokens(user);
      return createAuthResponse(user, tokens);

    } catch (error) {
      if (error.message.startsWith('[{')) {
        throw new Error(error.message);
      }
      if (error.code === 'P2002') {
        const field = error.meta.target[0];
        throw new Error(`${field} already exists`);
      }
      throw error;
    }
  },

  login: async (prisma, data) => {
    const user = await prisma.users.findFirst({
      where: { 
        email: data.email,
        is_deleted: false
      }
    });

    if (!user) throw new Error('Invalid credentials 1');

    if (user.locked_until && user.locked_until > new Date()) {
      throw new Error(`Account locked. Try again after ${user.locked_until}`);
    }

    const validPassword = await bcrypt.compare(data.password, user.password);
    if (!validPassword) {
      const attempts = (user.login_attempts || 0) + 1;
      const updates = { login_attempts: attempts };
      
      if (attempts >= parseInt(process.env.MAX_LOGIN_ATTEMPTS)) {
        updates.locked_until = new Date(
          Date.now() + parseInt(process.env.LOCKOUT_DURATION) * 60000
        );
      }
      
      await prisma.users.update({
        where: { id: user.id },
        data: updates
      });
      
      throw new Error('Invalid credentials 2');
    }

    await prisma.users.update({
      where: { id: user.id },
      data: { 
        login_attempts: 0,
        last_login: new Date()
      }
    });

    if (authConfig.verify_login) {
      const code = generateOTP(authConfig.otp_length);
      const method = data.otp_method || 'email';

      await prisma.otp_codes.create({
        data: {
          user_id: user.id,
          code,
          type: 'login',
          method,
          used: false,
          expires_at: new Date(Date.now() + authConfig.otp_expiry * 60000),
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      await sendOTP(user, code, method, prisma);

      return {
        success: true,
        res: {
          message: `Verification code sent to your ${method}`,
          user_id: user.id,
          requires_verification: true
        }
      };
    }

    const tokens = generateTokens(user);
    return createAuthResponse(user, tokens);
  },
  

  verify: async (prisma, data) => {
    const query = {
      user_id: data.user_id,
      code: data.code,
      type: data.type,
      used: false,
      expires_at: { gt: new Date() }
    };
  
    console.log(query);
    const otpRecord = await prisma.otp_codes.findFirst({
      where: query
    });

    if (!otpRecord) {
      throw new Error('Invalid or expired verification code');
    }
    // else{
    //   console.log('otpRecord', otpRecord);
    //   return { success: true, res: otpRecord };
    // }

    await prisma.otp_codes.update({
      where: { id: otpRecord.id },
      data: { used: true }
    });

    await prisma.users.update({
      where: { id: data.user_id },
      data: { 
        verified: true,
        verified_at: new Date()
      }
    });
    const user = await prisma.users.findFirst({
      where: { id: data.user_id }
    });

    const tokens = generateTokens(user);
    return createAuthResponse(user, tokens);
  },

  refresh: async (prisma, refreshToken) => {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      const user = await prisma.users.findFirst({
        where: {
          id: decoded.id,
          is_deleted: false
        }
      });

      if (!user) throw new Error('User not found');

      const tokens = generateTokens(user);
      return createAuthResponse(user, tokens);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  },

  requestReset: async (prisma, email) => {
    const user = await prisma.users.findFirst({
      where: { email, is_deleted: false }
    });

    if (!user) throw new Error('If a user exists with this email, they will receive reset instructions');

    const code = generateOTP(authConfig.otp_length);
    
    await prisma.otp_codes.create({
      data: {
        user_id: user.id,
        code,
        type: 'reset',
        method: 'email',
        used: false,
        expires_at: new Date(Date.now() + authConfig.otp_expiry * 60000),
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    await sendOTP(user, code, 'email', prisma);

    return {
      success: true,
      res: {
        message: 'If a user exists with this email, they will receive reset instructions',
        user_id: user.id
      }
    };
  },

  resetPassword: async (prisma, data) => {
    const { user_id, code, new_password } = data;

    const otpRecord = await prisma.otp_codes.findFirst({
      where: {
        user_id,
        code,
        type: 'reset',
        used: false,
        expires_at: { gt: new Date() }
      }
    });

    if (!otpRecord) {
      throw new Error('Invalid or expired reset code');
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await Promise.all([
      prisma.users.update({
        where: { id: user_id },
        data: { password: hashedPassword }
      }),
      prisma.otp_codes.update({
        where: { id: otpRecord.id },
        data: { used: true }
      })
    ]);

    return {
      success: true,
      res: { message: 'Password reset successfully' }
    };
  },

  createProduct: async (prisma, data) => {
    try {
      const validatedData = await validateModel('products', data);

      const dataToCreate = {
        ...validatedData,
        created_at: new Date(),
        updated_at: new Date()
      };

      const product = await prisma.products.create({
        data: dataToCreate
      });
      return { success: true, product };
    } catch (error) {
      throw error;
    }
  },

  socialConnect: async (prisma, data) => {
    
    const existingUser = await prisma.users.findFirst({
      where: { social_id: data.socialId }
    });

    if (existingUser) {
      
      const tokens = generateTokens(existingUser);
      return createAuthResponse(existingUser, tokens);
    }

    const newUser = await prisma.users.create({
      data: { ...data, created_at: new Date(), updated_at: new Date(), verified: true, is_deleted: false }
    });

    const tokens = generateTokens(newUser);
    return createAuthResponse(newUser, tokens);
  }
};

export default { authOperations }; 