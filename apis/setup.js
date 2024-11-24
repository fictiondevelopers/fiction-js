const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

class DatabaseSetup {
  constructor(options = {}) {
    this.includeAuth = options.includeAuth || false;
    this.tables = options.tables || {};
    this.prismaSchema = [];
  }

  addAuthTables() {
    // Users table is already defined in server.js initial schema
    return this;
  }

  addCustomTables() {
    Object.entries(this.tables).forEach(([tableName, schema]) => {
      const fields = Object.entries(schema.fields)
        .map(([fieldName, fieldType]) => `  ${fieldName}  ${fieldType}`)
        .join('\n');

      const relations = schema.relations
        ? Object.entries(schema.relations)
            .map(([relationName, relation]) => {
              const relationType = relation.type === 'many' ? '[]' : '';
              return `  ${relationName}  ${relation.model}${relationType}  ${relation.field}`;
            })
            .join('\n')
        : '';

      this.prismaSchema.push(`
model ${tableName} {
${fields}
${relations}
}`);
    });

    return this;
  }

  async generate() {
    const prismaDir = path.join(__dirname, '../src/prisma');
    const schemaPath = path.join(prismaDir, 'schema.prisma');

    try {
      // Read existing schema
      const currentSchema = await fs.readFile(schemaPath, 'utf-8');
      
      // Add custom tables if any
      if (Object.keys(this.tables).length > 0) {
        this.addCustomTables();
        
        // Append new models to existing schema
        const updatedSchema = currentSchema + '\n' + this.prismaSchema.join('\n');
        
        await fs.writeFile(schemaPath, updatedSchema);
      }

      // Generate Prisma client
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      console.log('Generating Prisma client...');
      await execAsync('npx prisma generate');

      return true;
    } catch (error) {
      console.error('Error generating database schema:', error);
      throw error;
    }
  }
}

const setup = (options) => new DatabaseSetup(options);

module.exports = { setup };