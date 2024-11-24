const Joi = require('joi');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Type mapping from Joi to Prisma
const joiToPrismaType = {
  string: 'String',
  number: 'Int',
  date: 'DateTime',
  boolean: 'Boolean',
  object: 'Json',
  array: 'Json',
  float: 'Float',
  'number.float': 'Float',
  'number.integer': 'Int',
};

class DatabaseSetup {
  constructor(config) {
    this.config = config;
    this.prismaDir = path.join(process.cwd(), 'prisma');
  }

  joiSchemaToPrisma(modelName, joiSchema) {
    const fields = [];
    const description = joiSchema.describe();

    Object.entries(description.keys).forEach(([fieldName, field]) => {
      const attributes = [];
      let type = joiToPrismaType[field.type] || 'String';

      // Handle required fields
      if (!field.flags?.presence && fieldName !== 'id') {
        type += '?';
      }

      // Handle special flags and rules
      if (field.flags?.unique) {
        attributes.push('@unique');
      }

      if (fieldName === 'id') {
        attributes.push('@id');
        attributes.push('@default(autoincrement())');
      }

      // Handle default values
      const defaultRule = field.rules?.find(rule => rule.name === 'default');
      if (defaultRule) {
        const defaultValue = defaultRule.args.value;
        if (type === 'String') {
          attributes.push(`@default("${defaultValue}")`);
        } else if (type === 'DateTime' && defaultValue === 'now') {
          attributes.push('@default(now())');
        } else {
          attributes.push(`@default(${defaultValue})`);
        }
      }

      // Handle relationships
      const relationRule = field.rules?.find(rule => rule.name === 'relation');
      if (relationRule) {
        const { model, fields, references } = relationRule.args;
        attributes.push(`@relation(fields: [${fields.join(', ')}], references: [${references.join(', ')}])`);
        type = model;
      }

      fields.push(`  ${fieldName}  ${type}  ${attributes.join(' ')}`);
    });

    return `model ${modelName} {\n${fields.join('\n')}\n}`;
  }

  generateSchema() {
    let schemaContent = `
      datasource db {
        provider = "postgresql"
        url      = env("DATABASE_URL")
      }
      
      generator client {
        provider = "prisma-client-js"
      }
    `;

    // console.log('Generating schema for models:', this.config.models);

    // Convert each model schema
    Object.entries(this.config.models).forEach(([modelName, joiSchema]) => {
      // console.log('Generating schema for model:', modelName);
      const prismaModel = this.joiSchemaToPrisma(modelName, joiSchema);
      schemaContent += `\n\n${prismaModel}`;
    });

    return schemaContent;
  }

  async setup() {
    try {
      console.log('Creating Prisma schema at:', this.prismaDir);
      await fs.mkdir(this.prismaDir, { recursive: true });
      
      const schema = this.generateSchema();
      const schemaPath = path.join(this.prismaDir, 'schema.prisma');
      await fs.writeFile(schemaPath, schema);
      console.log('Schema file written to:', schemaPath);

      // clear all tables
      // await execAsync('npx prisma migrate reset');

      console.log('Generating Prisma client...');
      await execAsync('npx prisma generate');
      
      // Add this line to ensure Prisma client is properly initialized
      const { PrismaClient } = require('@prisma/client');
      console.log('Prisma client initialized');

      if (process.env.NODE_ENV !== 'production') {
        console.log('Running database migrations...');
        await execAsync('npx prisma migrate dev --name init');
      }

      console.log('Database setup completed successfully!');
    } catch (error) {
      console.error('Database setup failed:', error);
      throw error;
    }
  }
}

module.exports = DatabaseSetup; 