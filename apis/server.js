const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const { authOperations } = require('../src/auth/operations');
const { authSchemas } = require('./schemas');
const endpoint = require('../src/core/Endpoint');
const { configure } = require('./config');
const { PrismaClient } = require('@prisma/client');
const DatabaseSetup = require('../src/database/setup-database');
const { schemasDB, fieldAttributes } = require('./db-structure');

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

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  const authEndpoints = {
    signup: endpoint('/auth/signup')
      .validate(authSchemas.signup)
      .handle('post', async (req) => {
        return await authOperations.signup(prisma, req.body);
      }),

    login: endpoint('/auth/login')
      .validate(authSchemas.login)
      .handle('post', async (req) => {
        return await authOperations.login(prisma, req.body);
      }),

    verify: endpoint('/auth/verify')
      .validate(authSchemas.verify)
      .handle('post', async (req) => {
        return await authOperations.verify(prisma, req.body);
      }),

    refresh: endpoint('/auth/refresh')
      .validate(authSchemas.refresh)
      .handle('post', async (req) => {
        return await authOperations.refresh(prisma, req.body.refreshToken);
      }),

    requestReset: endpoint('/auth/request-reset')
      .validate(authSchemas.requestReset)
      .handle('post', async (req) => {
        return await authOperations.requestReset(prisma, req.body.email);
      }),

    resetPassword: endpoint('/auth/reset-password')
      .validate(authSchemas.resetPassword)
      .handle('post', async (req) => {
        return await authOperations.resetPassword(prisma, req.body);
      })
  };

  // Replace the individual route handlers with:
  Object.values(authEndpoints).forEach(endpoint => {
    app.post(endpoint.path, (req, res) => endpoint.execute(req, res));
  });

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