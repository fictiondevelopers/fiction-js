/**
 * Imports required dependencies and modules
 */
import { v4 as uuidv4 } from 'uuid';
import validateModel from '../core/validation.js';
import authOperations from '../auth/operations.js';
import {prisma} from '../../apis/PrismaConfig.js';
import { schemasDB } from '../../apis/db-structure.js';

/**
 * Main Endpoint class that handles API endpoint operations
 * Provides functionality for CRUD operations, authentication, filtering etc.
 */
export default class Endpoint {

    /**
     * Initialize a new Endpoint instance
     * @param {string} path - API endpoint path
     * @param {string} method - HTTP method (defaults to "get")
     */
    constructor(path, method="get"){
        // Basic endpoint properties
        this.path = path;
        this.method = method;

        // Query building properties
        this.where = [];        // For WHERE clauses
        this.select = [];       // For SELECT fields
        this.orderBy = [];      // For ORDER BY clauses
        this.limit = 10;        // Default pagination limit
        this.offset = 0;        // Default pagination offset

        // Authentication and user-specific flags
        this.mine = false;      // Flag for user-specific data
        this.mineId = null;     // User ID for filtering
        this.doAuth = false;    // Authentication requirement flag

        // Data handling properties
        this.filters = [];      // Query filters
        this.pagination = [];   // Pagination settings
        this.data = null;       // Response data
        this.model = this.path.split("/")[0].toLowerCase();  // Database model name

        // History tracking for operations
        this.histories = []     // Operation history stack
        this.activeHistory = null;  // Current active history ID
        this.statusCode = 200;      // HTTP response code
        
        // User authentication state
        this.meUser = null;         // Authenticated user object
        this.authenticated = false;  // Authentication status
        this.meMode = false;        // User-specific mode flag
    }

    /////// build packs ////

    /**
     * Initializes a new operation sequence
     * @returns {Endpoint} - Returns this instance for chaining
     */
    start(){
        const iii = {auth:true,me:false};
        const uuid = uuidv4();
        const newHistory = {
            id:uuid,
            started:true,
            completed:false,
            mine:iii.me,
            history:[]
        }

        // Reset state for new operation
        this.histories.push(newHistory);
        this.activeHistory = uuid;
        this.meMode = iii.me;
        console.log("meModeCHanged",this.meMode);
        this.where = [];
        this.select = [];
        this.orderBy = [];
        this.limit = 10;
        this.offset = 0;
        this.filters = [];

        // Record start operation in history
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"start",
            input:iii
        });
        
        // Add auth step if required
        if(iii.auth){
            this.histories.find(h=>h.id==this.activeHistory).history.push({
                type:"auth",
                input:{}
            });
        }

        // Add mine step if user-specific
        if(iii.me){
            this.histories.find(h=>h.id==this.activeHistory).history.push({
                type:"mine",
                input:{}
            });
        }

        return this;
    }

    /**
     * Adds authentication step to operation sequence
     */
    auth(i={}){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"auth",
            input:i
        });
        return this;
    }

    /**
     * Adds user-specific filtering step
     */
    mera(){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"mine",
            input:{}
        });
        this.meMode = true;
        return this;
    }

    /**
     * Adds filter step to operation sequence
     * @param {Array} i - Array of filter conditions
     */
    filter(i=[]){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"filter",
            input:i
        });
        return this;
    }

    /**
     * Adds GET operation to sequence
     * @param {Object} i - Get operation parameters
     */
    get(i={}){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"get",
            input:i
        });
        return this;
    }

    // TODO: create
    // TODO: update
    // TODO: delete
    // TODO: join
    // TODO: upload
    // TODO: multi select in one query

    /**
     * Adds validation step to operation sequence
     */
    validate(i={}){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"validate",
            input:i
        });
        return this;
    }

    /**
     * Adds create operation to sequence
     */
    create(i={}){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"create",
            input:i
        });
        return this;
    }

    /**
     * Adds update operation to sequence
     * @param {Object} i - Update parameters, defaults to updating by ID
     */
    update(i={by:["id"]}){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"update",
            input:i
        });
        return this;
    }

    /**
     * Adds delete operation to sequence
     */
    delete(i={}){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"delete",
            input:i
        });
        return this;
    }

    // join(i={}){
    //     this.histories.find(h=>h.id==this.activeHistory).history.push({
    //         type:"join",
    //         input:i
    //     });
    //     return this;
    // }

    /**
     * Adds return step to operation sequence
     * Finalizes the operation chain
     */
    return(i={}){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"return",
            input:i
        });
        // return null; // to disable chaining after return has been called
    }

    /**
     * Marks current operation sequence as complete
     */
    end(){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"end",
            input:{}
        });
        this.histories.find(h=>h.id==this.activeHistory).completed = true;
        return this;
    }

    ///////////// build packs /////////////
    // custom helper functions //
    
    /**
     * Extracts query parameters from request
     */
    getQuery(input){
        const queryObject =  input.query;
        console.log("SFT: queryObject",queryObject);
        return queryObject;
    }

    /**
     * Checks if validation step exists in current history
     */
    shouldVaildate(){
        const validateFound = this.histories.find(h=>h.id==this.activeHistory).history.find(h=>h.type=="validate");
        return validateFound?true:false;
    }
    // custom helper functions //




    


    ///////////// execute /////////////

    /**
     * Resets endpoint state
     */
    async cleanUp_execute(iii){
        this.meMode = false;
        this.where = [];
        this.select = [];
        this.orderBy = [];
        this.limit = 10;
        this.offset = 0;
        this.filters = [];
    }

    /**
     * Handles authentication execution
     * Verifies bearer token and sets user context
     */
    async auth_execute(i={}){
        const breaerToken = this.input?.headers?.authorization?.split(" ")[1];

        const {success, res} = await authOperations.auth_me(prisma,breaerToken);
        if(!success){
            this.statusCode = 401;
            this.data = {error:res};
            return false;
        }


        // roles
        let permissionFailed = false;
        const roles = i.roles || [];
        const permissions = i.permissions || [];

        if(roles.length>0){
            const rolesList = await prisma.roles.findMany({where:{name:{in:roles}}});
            const roleIds = rolesList.map(r=>r.id);
            const userRoles = await prisma.user_roles.findMany({where:{user_id:res.id, role_id:{in:roleIds}}});
            if(userRoles.length==0){
                console.log("SFT: role denied");
                permissionFailed = true;
            }

            if(permissions.length>0){
                const perm_where = {where:{role_id:{in:roleIds}, permission_type:{in:permissions}, enabled:true}};
                console.log("SFT: perm_where",perm_where);
                console.log("SFT: permissions",permissions);
                console.log("SFT: roleIds",roleIds);
                const permissionsList = await prisma.role_permissions.findMany(perm_where);
                console.log("SFT: permissionsList that was found",permissionsList);
                if(permissionsList.length==0){
                    console.log("SFT: permission denied");
                    permissionFailed = true;
                }
            }
        }

        if(permissionFailed){
            this.statusCode = 403;
            this.data = {error:"Permission denied"};
            return false;
        }



        this.meUser = res;
        this.authenticated = true;
        return this;
    }

    /**
     * Sets up user-specific filtering
     */
    async mine_execute(){
        this.meMode = true;
        if(!this.authenticated){
            return false;
        }
        this.where.push({user_id:this.meUser.id})
        return this;
    }

    /**
     * Executes data validation
     */
    async validate_execute(i={}){
        let data = this.input.body;
        if(i.id && i.id=="auto"){
            data = {...this.input.body, id:50};
        }

        console.log("SFT: data sent for validation",data);

        const {error, value} = await validateModel(this.model,data)

        if(error){
            console.log("debug pt 1")
            this.statusCode = 400;
            this.data = {error:error.details[0].message};
            return false
        }

        return true;
    }

    /**
     * Processes and applies filters to query
     * Handles type casting based on schema
     */
    /**
     * Processes and applies filters to the query based on schema definitions
     * @param {Array} Cf - Custom filters array. If empty, uses all query params as filters
     * @returns {Endpoint} Returns this instance for method chaining
     */
    async filter_execute(Cf=[]){
        // Debug logging for initial state
        console.log("when the function starts", this.where);
        console.log("SFT: Input Cf:", Cf);
        console.log("SFT: Initial this.query:", this.query);

        // Get and validate model schema
        const modelSchema = schemasDB.models[this.model];
        if (!modelSchema) {
            console.error(`Model "${this.model}" not found in schema definitions`);
            return this;
        }

        /**
         * Helper function to cast values according to schema type
         * @param {any} value - The value to cast
         * @param {Object} fieldSchema - Schema definition for the field
         * @returns {any} The casted value
         */
        const castValue = (value, fieldSchema) => {
            if (!fieldSchema) return value;
            
            const schemaType = fieldSchema.type;
            if (schemaType === 'number') return Number(value);
            if (schemaType === 'boolean') return value === 'true';
            if (schemaType === 'date') return new Date(value);
            return value; // Default to string
        };

        // Process filters based on whether custom filters were provided
        if (Cf.length == 0) {
            // No custom filters - use all query parameters
            console.log("SFT: No custom filters provided");
            this.filters = this.query || {};
            console.log("SFT: Filters after query assignment:", this.filters);
            
            // Convert query parameters to properly typed filter objects
            this.filters = Object.entries(this.filters).map(([key, value]) => {
                console.log("SFT: Converting entry:", key, value);
                const fieldSchema = modelSchema.extract(key);
                const castedValue = castValue(value || "-100", fieldSchema); // if someone attempts to send empty
                return {[key]: castedValue};
            });
        } else {
            // Use only the specified custom filters
            console.log("SFT: Custom filters provided:", Cf);
            if (this.query) {
                // Map custom filters to their query values with proper type casting
                console.log("SFT: Query exists, mapping custom filters");
                this.filters = Cf.map(f => {
                    console.log("SFT: Mapping filter:", f, "Value:", this.query[f]);
                    const fieldSchema = modelSchema.extract(f);
                    const castedValue = castValue(this.query[f] || "-100", fieldSchema);  // if api had filter forced but frontend ddin't send a value, set -100 or "-100" to fail the query
                    return {[f]: castedValue};
                });
            } else {
                // No query parameters available
                console.log("SFT: No query exists, setting empty filters");
                this.filters = [];
            }
        }

        // Clean up and finalize filters
        console.log("SFT: this.filters beforeeee", this.filters);
        this.filters = this.filters.filter(f => f != null);  // Remove null filters
        console.log("SFT: this.filters", this.filters);
        
        // Combine existing where conditions with new filters
        this.where = [...this.where].concat(this.filters);
        console.log("SFT: this.where finallll", this.where);

        return this;
    }

    

    /**
     * Executes GET operation with pagination
     * Builds query with filters, sorting, and pagination
     */
    async get_execute(i={}){
        let q = {}

        if(this.where.length>0){
            q.where = this.where.reduce((acc, curr) => {
                return { ...acc, ...curr };
            }, {});
        }

        if(this.select.length>0){
            q.select = this.select;
        }else{
            // q.select = "*";
        }

        if(this.orderBy.length>0){
            q.orderBy = this.orderBy;
        }

        if(this.limit>0){
            q.take = this.limit;
        }

        if(i.limit){
            q.take = i.limit;
        }

        if(this.offset>0){
            q.skip = this.offset;
        }

        if(i.offset){
            q.skip = i.offset;
        }

        console.log("SFT: q",q);

       
        // Get total count for pagination
        const total = await prisma[this.model].count({
            where: q.where
        });

        // Get paginated results
        const results = await prisma[this.model].findMany(q);

        // Calculate pagination metadata
        const page = Math.floor((q.skip || 0) / (q.take || 10)) + 1;
        const pageSize = q.take || 10;
        const totalPages = Math.ceil(total / pageSize);
        const hasMore = page < totalPages;
        const remaining = Math.max(0, total - (page * pageSize));

        this.data = {
            data:results,
            pagination: {
                total,
                page,
                pageSize,
                totalPages,
                hasMore,
                remaining
            }
        };
        return this;
    }

    /**
     * Executes CREATE operation
     * Handles user-specific creation if in meMode
     */
    async create_execute(i={}){
        console.log("meeeeeeeeeeeeeeeeeeeeeeeeeeeee mode", this.meMode);

        let input_data = this.input.body;

        if(this.meMode){
            input_data.user_id = this.meUser.id;
        }
        let data_to_create = {
            ...input_data,
            created_at:new Date(),
        }

        if(this.meMode && !this.authenticated){
            this.statusCode = 401;
            this.data = {error:"Unauthorized"};
            return false
        }

        if(this.meMode){
            data_to_create.user_id = this.meUser.id;
        }
        const create_data = {
            data:data_to_create
        }

        this.data = await prisma[this.model].create(create_data);
        return this;
    }

    /**
     * Executes UPDATE operation
     */
    async update_execute(i={}){
        let q = {}
        if(this.where.length>0){
            q.where = this.where.reduce((acc, curr) => {
                return { ...acc, ...curr };
            }, {});
        }

        const exists = await prisma[this.model].findFirst({where:q.where});
        if(!exists){
            console.log("Before update, I didn't find as per the where clause",q.where);
            this.statusCode = 404;
            this.data = {error:"Not found"};
            return false;
        }

        

       

        q.data = this.input.body;
        this.data = await prisma[this.model].update(q);
        return true;
    }

    /**
     * Executes DELETE operation
     */
    async delete_execute(d){
        let q = {}
        if(this.where.length>0){
            q.where = this.where.reduce((acc, curr) => {
                return { ...acc, ...curr };
            }, {});
        }

        const exists = await prisma[this.model].findFirst({where:q.where});
        if(!exists){
            this.statusCode = 404;
            this.data = {error:"Not found"};
            return false;
        }

        // q.data = this.input.body;
        this.data = await prisma[this.model].delete(q);
        return true;
    }

    /**
     * Finalizes operation and sends response
     */
    async return_execute(code=200){
        this.statusCode = code;
        this.histories = [];
        console.log("status code",this.statusCode);
        this?.output?.status(this.statusCode!={} && this.statusCode>0 ? this.statusCode  : 200)?.send(this.data);
        return this;
    }

    ///////////// execute /////////////

    
    ///////////// executer /////////////
    async execute(){
        
        console.log("SFT: step 2");
        console.log("SFT: this.histories",this.histories);

        if(this.histories.length==0){
            console.log("debug pt 2")
            this.return_execute(400);
            return;
        }

        for(let i=0; i<this.histories.length; i++){
            const history = this.histories[i];
            console.log(`===================== starting #${i} ${history.id} =====================`);


            const steps = history.history;
            for(let j=0; j<steps.length; j++){
                const step = steps[j];
                console.log(`FJS: step #${j}`);


                if(step.type=="start"){
                    this.cleanUp_execute(step.input)
                }


                if(step.type=="auth"){
                    console.log(`FJS: step #${j} auth`);
                    const authSuccess = await this.auth_execute(step.input);
                    if(!authSuccess){
                        await this.return_execute(401);
                        return;
                    }
                }

                if(step.type=="mine"){
                    console.log(`FJS: step #${j} mine`);
                    const mineSuccess = await this.mine_execute();
                    if(!mineSuccess){
                        await this.return_execute(401);
                        return;
                    }
                }

                if(step.type=="filter"){
                    console.log(`FJS: step #${j} filter`,step.filters);
                    await this.filter_execute(step.input);
                }

                if(step.type=="get"){
                    console.log(`FJS: step #${j} get`);
                    await this.get_execute(step.input);
                }

                if(step.type=="create"){
                    console.log(`FJS: step #${j} create`);
                    const createSuccess = await this.create_execute(step.input);
                    if(!createSuccess){
                        console.log("debug pt 3")
                        await this.return_execute(400);
                        return;
                    }
                }

                if(step.type=="update"){
                    console.log(`FJS: step #${j} update`);
                    const updateSuccess = await this.update_execute(step.input);
                    if(!updateSuccess){
                        console.log("debug pt 3")
                        await this.return_execute(400);
                        return;
                    }
                }

                if(step.type=="delete"){
                    console.log(`FJS: step #${j} delete`);
                    const deleteSuccess = await this.delete_execute();
                    if(!deleteSuccess){
                        console.log("debug pt 3")
                        await this.return_execute(400);
                        return;
                    }
                }

                if(step.type=="validate"){
                    console.log(`FJS: step #${j} validate`);
                    const isValid =await this.validate_execute(step.input);
                    if(!isValid){
                        console.log("debug pt 4")
                        await this.return_execute(400);
                        return;
                    }
                }

                if(step.type=="return"){
                    console.log(`FJS: step #${j} return`);
                    await this.return_execute(step.input);
                }

            }







            console.log(`===================== ending #${i} ${history.id} =----------------`);
        }
    }
    ///////////// executer /////////////





    //////////master/////
    async handle(req, res) {
        // Continue with request handling
        this.input = req;
        this.query = this.getQuery(this.input);
        this.output = res;
        console.log("SFT: step 1");

        await this.execute();
    }
    //////////master/////

}


