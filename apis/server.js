const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const { authOperations } = require('../src/auth/operations');
const endpoint = require('../src/core/Endpoint');
const { configure } = require('./config');
const { PrismaClient } = require('@prisma/client');
const DatabaseSetup = require('../src/database/setup-database');
const { schemasDB } = require('./db-structure');
const passport = require('passport');
const session = require('express-session')
require('./../passport-setup')


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
      verify_signup: true
    }
  });

  const app = express();
  const prisma = new PrismaClient();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));


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
    signup: endpoint('/api/auth/signup')
      .handle('post', async (req) => {
        // When verify_signup is true, returns:
        // { success: true, res: { message: string, user_id: string, requires_verification: true } }
        // When verify_signup is false, returns:
        // { success: true, res: { user: User, accessToken: string, refreshToken: string } }
        return await authOperations.signup(prisma, req.body);
      }),

    login: endpoint('/api/auth/login')
      .handle('post', async (req) => {
        // When verify_login is true, returns:
        // { success: true, res: { message: string, user_id: string, requires_verification: true } }
        // When verify_login is false, returns:
        // { success: true, res: { user: User, accessToken: string, refreshToken: string } }
        return await authOperations.login(prisma, req.body);
      }),

    verify: endpoint('/api/auth/verify')
      .handle('post', async (req) => {
        // Expects: { user_id: string, code: string, type: 'signup' | 'login' }
        // Returns: { success: true, res: { user: User, accessToken: string, refreshToken: string } }
        return await authOperations.verify(prisma, req.body);
      }),

    refresh: endpoint('/api/auth/refresh')
      .handle('post', async (req) => {
        return await authOperations.refresh(prisma, req.body.refreshToken);
      }),

    requestReset: endpoint('/api/auth/request-reset')
      .handle('post', async (req) => {
        return await authOperations.requestReset(prisma, req.body.email);
      }),

    resetPassword: endpoint('/api/auth/reset-password')
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

  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get('/auth/google/callback',
    passport.authenticate('google',
      { failureRedirect: '/failed' }),
    (req, res) => {
      res.redirect('/good');
    })

  app.get('/failed', (req, res) => res.send('You Failed to log in!'))

  app.get('/good', isLoggedIn, (req, res) => {
    console.log(req.user._json)
    res.send('You successfully logged in!')
    // res.render('pages/profile.ejs', {
    //   name: req.user.displayName,
    //   pic: req.user._json.picture,
    //   email: req.user.emails[0].value,
    //   profile: "google"
    // })
  })

  /////////////////////////// GOOOOGLE AUTH ENDS ///////////////////////////


  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  });

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