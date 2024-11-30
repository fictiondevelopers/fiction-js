import express from 'express';
import cors from 'cors';

// import { exec } from 'child_process';
// import util from 'util';
// import { promisify } from 'util';
// import fs from 'fs';
// import path from 'path';
import authOperations  from '../src/auth/operations.js';
import endpoint from '../src/core/Endpoint.js';
import { configure } from './config.js';
import DatabaseSetup from '../src/database/setup-database.js';
import { schemasDB } from './db-structure.js';
import passport from 'passport';
import session from 'express-session';
import './../passport-setup.js';
import cookieParser from 'cookie-parser';
import { apiRoutes } from './faisal.js';
import Endpoint from '../src/core/EndpointsTransformer.js';
import {prisma} from './PrismaConfig.js';
import uploadToS3 from '../src/core/fileUploaderToS3.js';
import fileUpload from 'express-fileupload';

async function initializeDatabase() {
  try {
    const dbSetup = new DatabaseSetup(schemasDB);
    await dbSetup.setup();
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

async function startServer() {
  // Initialize database first
  await initializeDatabase();

  // Configure auth settings
  configure({
    auth: {
      verify_login: false,
      verify_signup: false
    }
  });

  const app = express();
  // const prisma = new PrismaClient();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // social auth
  app.use(session({
    secret: ['key1', 'key2'], // Use environment variables in production
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  const authEndpoints = {
    signup: new endpoint('/api/auth/signup')
      .handle('post', async (req) => {
        // When verify_signup is true, returns:
        // { success: true, res: { message: string, user_id: string, requires_verification: true } }
        // When verify_signup is false, returns:
        // { success: true, res: { user: User, accessToken: string, refreshToken: string } }
        return await authOperations.signup(prisma, req.body);
      }),

    login: new endpoint('/api/auth/login')
      .handle('post', async (req) => {
        // When verify_login is true, returns:
        // { success: true, res: { message: string, user_id: string, requires_verification: true } }
        // When verify_login is false, returns:
        // { success: true, res: { user: User, accessToken: string, refreshToken: string } }
        return await authOperations.login(prisma, req.body);
      }),

    verify: new endpoint('/api/auth/verify')
      .handle('post', async (req) => {
        // Expects: { user_id: string, code: string, type: 'signup' | 'login' }
        // Returns: { success: true, res: { user: User, accessToken: string, refreshToken: string } }
        return await authOperations.verify(prisma, req.body);
      }),

    refresh: new endpoint('/api/auth/refresh')
      .handle('post', async (req) => {
        return await authOperations.refresh(prisma, req.body.refreshToken);
      }),

    requestReset: new endpoint('/api/auth/request-reset')
      .handle('post', async (req) => {
        return await authOperations.requestReset(prisma, req.body.email);
      }),

    resetPassword: new endpoint('/api/auth/reset-password')
      .handle('post', async (req) => {
        return await authOperations.resetPassword(prisma, req.body);
      })
  };

  // Replace the individual route handlers with:
  Object.values(authEndpoints).forEach(endpoint => {
    app.post(endpoint.path, (req, res) => endpoint.execute(req, res));
  });


  /////////////////////////// GOOOOGLE AUTH ///////////////////////////

  const isLoggedIn = (req, res, next) => {
    if (req.user) {
      next();
    } else {
      res.sendStatus(401);
    }
  }

  app.get('/auth/google', (req, res) => {
    // Store return URL in session before authentication
    if (!req.session) {
      req.session = {};
    }
    // Store return URL in a cookie instead of session
    res.cookie('returnUrl', req.query.return_url, {
      maxAge: 5 * 60 * 1000, // 5 minutes
      httpOnly: true
    });
    console.log("Google auth - Initial return_url:", req.query.return_url);
    console.log("Google auth - Cookie return_url set");
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
  });

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/failed' }),
    async (req, res) => {
      try {
        const googleUser = req.user._json;
        
        const result = await authOperations.socialConnect(prisma, {
          first_name: googleUser.given_name,
          last_name: googleUser.family_name,
          social_id: googleUser.sub,
          type: "Google", 
          picture_url: googleUser.picture
        });

        // Get return URL from cookie with a default fallback
        const returnUrl = req.cookies.returnUrl || 'https://fictiondevelopers.com';
        
        // Clear the cookie
        res.clearCookie('returnUrl');

        // Redirect with access token
        const redirectUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}access_token=${result?.res?.accessToken}`;
        res.redirect(redirectUrl);
        
      } catch (error) {
        console.error('Social connect error:', error);
        res.redirect('/failed');
      }
    }
  );

  app.get('/failed', (req, res) => res.send('Failed to authenticate with Google'));

  /////////////////////////// GOOOOGLE AUTH ENDS ///////////////////////////


  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  });



  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  apiRoutes.forEach(endpointTemplate => {
    app[endpointTemplate.method || 'get']("/api/" + endpointTemplate.path, async (req, res) => {
        try {
            // Create a new instance for each request
            const endpoint = new Endpoint(endpointTemplate.path, prisma, endpointTemplate.method);
            // Copy over any necessary configuration from the template
            endpoint.method = endpointTemplate.method;
            endpoint.histories = [...endpointTemplate.histories];

            console.log("histories to fire up ==== ");
            endpoint.histories.map(h=>console.log(h));
            console.log("end");
            
            await endpoint.handle(req, res);
        } catch (error) {
            console.error('Error handling request:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
  });
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////
  //////////////////////////////////////////////// API Routes ////////////////////////////////////////


  //////////////////////////////////////////////// Files ////////////////////////////////////////
  //////////////////////////////////////////////// Files ////////////////////////////////////////
  //////////////////////////////////////////////// Files ////////////////////////////////////////
  //////////////////////////////////////////////// Files ////////////////////////////////////////
  //////////////////////////////////////////////// Files ////////////////////////////////////////

  app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    useTempFiles: true
  }));

  app.post('/api/files/upload', async (req, res) => {
    try {
      const bearerToken = req.headers.authorization?.split(" ")[1];
      const {success, user} = await authOperations.auth_me(prisma, bearerToken);
      
      if(!success){
        return res.status(401).json({error: "Unauthorized"});
      }

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({error: "No files attached"});
      }

      console.log("Uploading files to S3");
      console.log(req.files.files);
      console.log("================");

      const files = req.files.files;
      const urls = await uploadToS3(files, req.body.folder || '');
      res.json({ urls });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({error: "Failed to upload files"});
    }
  });


  //////////////////////////////////////////////// Files ////////////////////////////////////////
  //////////////////////////////////////////////// Files ////////////////////////////////////////
  //////////////////////////////////////////////// Files ////////////////////////////////////////
  //////////////////////////////////////////////// Files ////////////////////////////////////////
  //////////////////////////////////////////////// Files ////////////////////////////////////////
  //////////////////////////////////////////////// Files ////////////////////////////////////////

  // Start server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Play a sound to indicate server started successfully
    console.log('\u0007'); // Using Unicode escape sequence for bell character
  });

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
  });
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});