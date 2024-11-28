const endpoint = require('./Endpoint');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class EndpointsTransformer {
  constructor() {
    this.endpoints = {};
  }

  create(path, incoming) {
    return endpoint(path)
      .handle('post', async (req) => {
        const data = req.body;
        const result = await prisma[this.getTableName(path)].create({
          data: data
        });
        return result;
      });
  }

  list(path, incoming) {
    return endpoint(path)
      .handle('get', async (req) => {
        const result = await prisma[this.getTableName(path)].findMany();
        return result;
      });
  }

  get(path, incoming) {
    return endpoint(path)
      .handle('get', async (req) => {
        const id = parseInt(req.params.id);
        const result = await prisma[this.getTableName(path)].findUnique({
          where: { id }
        });
        return result;
      });
  }

  update(path, incoming) {
    return endpoint(path)
      .handle('put', async (req) => {
        const id = parseInt(req.params.id);
        const data = req.body;
        const result = await prisma[this.getTableName(path)].update({
          where: { id },
          data
        });
        return result;
      });
  }

  delete(path, incoming) {
    return endpoint(path)
      .handle('delete', async (req) => {
        const id = parseInt(req.params.id);
        const result = await prisma[this.getTableName(path)].delete({
          where: { id }
        });
        return result;
      });
  }

  filter(incoming) {
    // Will be implemented later
    return this;
  }

  paginate(incoming) {
    // Will be implemented later
    return this;
  }

  mine() {
    // Will be implemented later to handle user-specific data
    return this;
  }

  return(statusCode) {
    // Will be implemented later to handle response formatting
    return this;
  }

  // Helper method to extract table name from path
  getTableName(path) {
    return path.split('/')[0].toLowerCase();
  }
}

// Helper function to create endpoints
const e = (path, incoming) => {
  const transformer = new EndpointsTransformer();
  const [resource, action] = path.split('/');
  
  switch(action) {
    case 'create':
      return transformer.create(path, incoming);
    case 'list':
      return transformer.list(path, incoming);
    case 'get':
      return transformer.get(path, incoming);
    case 'update':
      return transformer.update(path, incoming);
    case 'delete':
      return transformer.delete(path, incoming);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
};

module.exports = { e };
