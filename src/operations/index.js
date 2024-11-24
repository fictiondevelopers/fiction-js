const jwt = require('jsonwebtoken');
const Joi = require('joi');

const auth = async (result, context) => {
  if (!context.authEnabled) return result;
  
  const token = context.incoming.headers?.authorization;
  if (!token) {
    throw new Error('Authentication required');
  }
  
  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    
    // Check if user exists and is not deleted
    const user = await context.prisma.users.findFirst({
      where: {
        id: decoded.id,
        is_deleted: false
      }
    });

    if (!user) throw new Error('User not found');

    // Check role if specified
    if (context.requiredRoles && !context.requiredRoles.includes(user.role)) {
      throw new Error('Unauthorized role');
    }

    context.user = user;
    return result;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

const log = async (result, context, options) => {
  console.log(`[${options.tag}]`, {
    path: context.path,
    timestamp: new Date(),
    result: result
  });
  return result;
};

const filter = async (result, context, conditions) => {
  const prismaConditions = Object.entries(conditions).reduce((acc, [key, value]) => {
    if (value === "LIKE") {
      const searchValue = context.incoming.query?.search || context.incoming.body?.search;
      acc[key] = { contains: searchValue };
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});
  
  context.prismaConditions = prismaConditions;
  return result;
};

const join = async (result, context, relations) => {
  const include = {};
  
  relations.parents?.forEach(relation => {
    const [[table, field]] = Object.entries(relation);
    include[table.split('.')[0]] = true;
  });
  
  relations.children?.forEach(relation => {
    const [[table, field]] = Object.entries(relation);
    include[table.split('.')[0]] = true;
  });
  
  context.prismaInclude = include;
  return result;
};

const get = async (result, context) => {
  const queryOptions = {
    where: context.prismaConditions,
    include: context.prismaInclude
  };
  
  if (context.isPaginated) {
    queryOptions.skip = parseInt(context.incoming.query?.offset || 0);
    queryOptions.take = parseInt(context.incoming.query?.limit || 10);
  }
  
  return queryOptions;
};

const paginate = async (result, context) => {
  const { skip, take } = result;
  const data = await context.prisma[context.tableName].findMany(result);
  const total = await context.prisma[context.tableName].count({
    where: result.where
  });
  
  return {
    data,
    pagination: {
      offset: skip,
      limit: take,
      total
    }
  };
};

const return_ = async (result, context) => {
  try {
    return {
      success: true,
      res: result
    };
  } catch (error) {
    return {
      success: false,
      res: error.message
    };
  }
};

const validate = async (result, context, schema) => {
  try {
    const validatedData = await schema.validateAsync(context.incoming.body);
    context.incoming.body = validatedData;
    return result;
  } catch (error) {
    throw new Error(error.details[0].message);
  }
};

module.exports = {
  auth,
  log,
  filter,
  join,
  get,
  paginate,
  return: return_,
  validate
}; 