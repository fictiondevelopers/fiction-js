const { authSchemas } = require('../../apis/schemas');

class Endpoint {
  constructor(path) {
    this.path = path;
    this.handlers = new Map();
    this.schema = null;
    this.authRequired = false;
    this.requiredRoles = null;
  }

  validate(schema) {
    this.schema = schema;
    return this;
  }

  auth(roles = null) {
    this.authRequired = true;
    this.requiredRoles = roles;
    return this;
  }

  handle(method, handler) {
    this.handlers.set(method.toLowerCase(), handler);
    return this;
  }

  async execute(req, res) {
    const method = req.method.toLowerCase();
    const handler = this.handlers.get(method);

    if (!handler) {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    try {
      // Validate request body if schema exists
      if (this.schema) {
        const { error, value } = this.schema.validate(req.body);
        if (error) {
          return res.status(400).json({
            success: false,
            error: error.details[0].message
          });
        }
        req.body = value;
      }

      // Execute handler
      const result = await handler(req, res);
      
      // If result is already sent, don't send again
      if (res.headersSent) return;

      // Check if result is already in the correct format
      if (result && typeof result === 'object' && ('success' in result)) {
        return res.json(result);
      }

      // If not, wrap it in the standard format
      return res.json({
        success: true,
        res: result
      });

    } catch (error) {
      // If response is already sent, don't send error
      if (res.headersSent) return;

      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

// Helper function to create endpoints
const endpoint = (path) => new Endpoint(path);

module.exports = endpoint; 