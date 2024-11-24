class Context {
  constructor(path, incoming) {
    this.path = path;
    this.incoming = incoming;
    this.operations = [];
    this.authEnabled = false;
    this.logTags = [];
    this.filterConditions = [];
    this.joinRelations = {
      parents: [],
      children: []
    };
    this.isPaginated = false;
    this.requiredRoles = null;
    this.prismaConditions = {};
    this.prismaInclude = {};
    this.tableName = path.split('/')[1]; // Extracts table name from path
  }

  addOperation(operation) {
    this.operations.push(operation);
    return this;
  }

  async execute() {
    let result = null;
    
    try {
      for (const operation of this.operations) {
        result = await operation(result, this);
      }
      return result;
    } catch (error) {
      return {
        success: false,
        res: error.message
      };
    }
  }
}

module.exports = Context; 