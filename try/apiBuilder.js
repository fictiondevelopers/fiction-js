// apiBuilder.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Endpoint class to handle chainable logic
class Endpoint {
  constructor(route) {
    this.route = route;
    this.filters = {}; // Store filters here
    this.pagination = { skip: 0, take: 10 }; // Default pagination
    this.data = null; // Store fetched data here
    this.statusCode = 200; // Default status code
    this.model = null; // Will dynamically decide which Prisma model to query
  }

  // Set the Prisma model dynamically based on the route
  modelFor(route) {
    if (route.includes('products')) {
      this.model = 'products';
    }
    if (route.includes('users')) {
      this.model = 'users';
    }
    // Add more models as needed

    if (!this.model) throw new Error('Model not defined for this route');
    return this.model;
  }

  // Method to capture the filters from query params
  filter(allowedFilters = []) {
    return (req, res, next) => {
      const filters = req.query;

      // If no specific filters are defined, apply all query params as filters
      if (allowedFilters.length === 0) {
        this.filters = filters;
      } else {
        this.filters = {};
        allowedFilters.forEach((filter) => {
          if (filters[filter]) {
            this.filters[filter] = filters[filter];
          }
        });
      }
      next(); // Proceed to the next middleware
    };
  }

  // Method to handle pagination logic
  paginate() {
    return (req, res, next) => {
      const { page = 1, limit = 10 } = req.query;
      this.pagination.skip = (page - 1) * limit;
      this.pagination.take = Number(limit);
      next(); // Proceed to the next middleware
    };
  }

  // Method to fetch data from the database using Prisma
  async get() {
    const model = this.modelFor(this.route);

    // Build the Prisma query based on filters and pagination
    this.data = await prisma[model].findMany({
      where: this.filters,
      skip: this.pagination.skip,
      take: this.pagination.take,
    });
    return this; // Return the Endpoint object itself to allow chaining
  }

  // Return the data
  return(statusCode = 200) {
    this.statusCode = statusCode;
    return (req, res) => {
      res.status(this.statusCode).json(this.data);
    };
  }

  // Main handler to apply filters, pagination, and then get data
  async handle(req, res) {
    await this.get(); // Get the data
    this.return()(req, res); // Return the response
  }
}

// Export a function to create an Endpoint instance
export const e = (route) => new Endpoint(route);
