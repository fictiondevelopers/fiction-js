// server.js
import express from 'express';
import apiRoutes from './apiRoutes.js';

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Register the routes
apiRoutes.forEach(endpoint => {
  app[endpoint.method || 'get'](endpoint.route, (req, res) => endpoint.handle(req, res));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
