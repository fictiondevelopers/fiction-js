import Joi from 'joi';
import { schemasDB } from '../../apis/db-structure.js';

/**
 * Generic validation function for any model
 * @param {string} modelName - Name of the model (e.g., 'users', 'products')
 * @param {object} data - Data to validate
 * @param {array} fields - Optional array of field names to validate (if not provided, validates all fields)
 * @returns {Promise<object>} - Validated data
 */
const validateModel = async (modelName, data, fields = null) => {
  console.log(`[validateModel] Starting validation for model: ${modelName}`);
  console.log('[validateModel] Input data:', data);
  console.log('[validateModel] Fields to validate:', fields);

  try {
    // Check if model exists
    const modelSchema = schemasDB.models[modelName];
    if (!modelSchema) {
      console.error(`[validateModel] Model "${modelName}" not found in schema definitions`);
      throw new Error(`Model "${modelName}" not found in schema definitions`);
    }
    console.log('[validateModel] Found model schema');

    // Create a new schema with only the fields we want to validate
    let validationSchema;
    if (fields) {
      // Extract only specified fields
      console.log('[validateModel] Creating schema with specified fields');
      const schemaFields = fields.reduce((acc, field) => {
        if (modelSchema.extract(field)) {
          acc[field] = modelSchema.extract(field);
          console.log(`[validateModel] Added field "${field}" to validation schema`);
        } else {
          console.warn(`[validateModel] Field "${field}" not found in model schema`);
        }
        return acc;
      }, {});
      validationSchema = Joi.object(schemaFields);
    } else {
      // Use all fields from the model schema
      console.log('[validateModel] Using complete model schema');
      validationSchema = modelSchema;
    }

    console.log('[validateModel] Validation schema created:', validationSchema.describe());

    // Validate with abortEarly: false to get all validation errors
    const validatedData = await validationSchema.validateAsync(data, {
      abortEarly: false,
      external: true  // Enable external validation rules
    });

    console.log('[validateModel] Raw validation result:', validatedData);
    return validatedData;

  } catch (error) {
    if (error.isJoi) {
      // Format Joi validation errors
      console.error('[validateModel] Joi validation error:', error);
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      console.error('[validateModel] Formatted errors:', errors);
      throw new Error(JSON.stringify(errors));
    }
    console.error('[validateModel] Unexpected error:', error);
    throw error;
  }
};

export  default  validateModel