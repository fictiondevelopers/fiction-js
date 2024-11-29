import { v4 as uuidv4 } from 'uuid';
import validateModel from '../core/validation.js';
import authOperations from '../auth/operations.js';
import {prisma} from '../../apis/PrismaConfig.js';

export default class Endpoint {


    constructor(path, method="get"){
        this.path = path;
        this.method = method;


        this.where = [];
        this.select = [];
        this.orderBy = [];
        this.limit = 10;
        this.offset = 0;

        this.mine = false;
        this.mineId = null;
        this.doAuth = false;

        this.filters = [];
        this.pagination = [];

        this.data = null;
        this.model =  this.path.split("/")[0].toLowerCase();


        this.histories = []
        this.activeHistory = null;
        this.statusCode = 200;
        this.meUser = null;
        this.authenticated = false;

        this.meMode = false;
    }



    /////// build packs ////

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

        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"start",
            input:iii
        });
        
        if(iii.auth){
            this.histories.find(h=>h.id==this.activeHistory).history.push({
                type:"auth",
                input:{}
            });
        }

        if(iii.me){
            this.histories.find(h=>h.id==this.activeHistory).history.push({
                type:"mine",
                input:{}
            });
        }


        return this;
    }
    auth(){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"auth",
            input:{}
        });
        return this;
    }

    mera(){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"mine",
            input:{}
        });
        this.meMode = true;
        return this;
    }

    filter(i=[]){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"filter",
            input:i
        });
        return this;
    }

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

    validate(i={}){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"validate",
            input:i
        });
        return this;
    }

    create(i={}){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"create",
            input:i
        });
        return this;
    }

    update(i={by:["id"]}){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"update",
            input:i
        });
        return this;
    }

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

    return(i={}){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"return",
            input:i
        });
        // return null; // to disable chaining after return has been called
    }

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
    getQuery(input){
        const queryObject =  input.query;
        console.log("SFT: queryObject",queryObject);
        return queryObject;
    }

    shouldVaildate(){
        const validateFound = this.histories.find(h=>h.id==this.activeHistory).history.find(h=>h.type=="validate");
        return validateFound?true:false;
    }
    // custom helper functions //




    


    ///////////// execute /////////////

    async cleanUp_execute(iii){
        this.meMode = false;
        this.where = [];
        this.select = [];
        this.orderBy = [];
        this.limit = 10;
        this.offset = 0;
        this.filters = [];
    }

    async auth_execute(){

        const breaerToken = this.input?.headers?.authorization?.split(" ")[1];

        const {success, res} = await authOperations.auth_me(prisma,breaerToken);
        if(!success){
            this.statusCode = 401;
            this.data = {error:res};
            return false;
        }
        this.meUser = res;
        this.authenticated = true;
        return this;
    }

    async mine_execute(){
        this.meMode = true;
        if(!this.authenticated){
            return false;
        }
        this.where.push({user_id:this.meUser.id})
        return this;
    }

    async validate_execute(i={}){

        let data = this.input.body;
        if(i.id && i.id=="auto"){
            data = {...this.input.body, id:50};
        }

        console.log("SFT: data sent for validation",data);

        const {error, value} = await validateModel(this.model,data)

        if(error){
            this.statusCode = 400;
            this.data = {error:error.details[0].message};
            return false
        }

        return true;
    }

    async filter_execute(Cf=[]){

        console.log("when the function starts", this.where);

        console.log("SFT: Input Cf:", Cf);
        console.log("SFT: Initial this.query:", this.query);
        
        if(Cf.length==0){
            console.log("SFT: No custom filters provided");
            this.filters = this.query || {};
            console.log("SFT: Filters after query assignment:", this.filters);
            this.filters = Object.entries(this.filters).map(([key, value]) => {
                console.log("SFT: Converting entry:", key, value);
                return {[key]: value || "gublomoteory"};
            });
            console.log("SFT: Filters after conversion:", this.filters);
        }else{
            console.log("SFT: Custom filters provided:", Cf);
            if(this.query){
                console.log("SFT: Query exists, mapping custom filters");
                this.filters = Cf.map(f=>{
                    console.log("SFT: Mapping filter:", f, "Value:", this.query[f]);
                    return {[f]:this.query[f] || "gublomoteory"};
                });
                console.log("SFT: Filters after mapping:", this.filters);
            }else{
                console.log("SFT: No query exists, setting empty filters");
                this.filters = [];
            }
        }

        console.log("SFT: this.filters beforeeee",this.filters);

        this.filters = this.filters.filter(f=>f!=null);



        console.log("SFT: this.filters",this.filters);

        
        this.where = [...this.where].concat(this.filters)

        console.log("SFT: this.where finallll",this.where);

        return this;
    }

    

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

       

        // Get total count
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

    async update_execute(i={}){

        let q = {}
        if(this.where.length>0){
            q.where = this.where.reduce((acc, curr) => {
                return { ...acc, ...curr };
            }, {});
        }

        q.data = this.input.body;
        this.data = await prisma[this.model].update(q);
        return this;
    }

    async delete_execute(d){
        let q = {}
        if(this.where.length>0){
            q.where = this.where.reduce((acc, curr) => {
                return { ...acc, ...curr };
            }, {});
        }

        q.data = this.input.body;
        this.data = await prisma[this.model].delete(q);
        return this;
    }

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
                    const authSuccess = await this.auth_execute();
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
                        await this.return_execute(400);
                        return;
                    }
                }

                if(step.type=="update"){
                    console.log(`FJS: step #${j} update`);
                    await this.update_execute(step.input);
                }

                if(step.type=="delete"){
                    console.log(`FJS: step #${j} delete`);
                    await this.delete_execute();
                }

                if(step.type=="validate"){
                    console.log(`FJS: step #${j} validate`);
                    const isValid =await this.validate_execute(step.input);
                    if(!isValid){
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


