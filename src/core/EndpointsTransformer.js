import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class Endpoint {


    constructor(path){
        this.path = path;


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

        this.method = "get";
        this.data = null;
        this.model =  this.path.split("/")[0].toLowerCase();


        this.histories = []
        this.activeHistory = null;
        this.statusCode = 200;
    }



    /////// build packs ////

    start(){
        const uuid = uuidv4();
        const newHistory = {
            id:uuid,
            started:true,
            completed:false,
            history:[]
        }

        this.histories.push(newHistory);
        this.activeHistory = uuid;
        return uuid;
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

    return(i={}){
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"return",
            input:i
        });
        return this;
    }

    end(){
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
    // custom helper functions //




    


    ///////////// execute /////////////

    filter_execute(Cf=[]){

        console.log("SFT: Input Cf:", Cf);
        console.log("SFT: Initial this.query:", this.query);
        
        if(Cf.length==0){
            console.log("SFT: No custom filters provided");
            this.filters = this.query || {};
            console.log("SFT: Filters after query assignment:", this.filters);
            this.filters = Object.entries(this.filters).map(([key, value]) => {
                console.log("SFT: Converting entry:", key, value);
                return {[key]: value};
            });
            console.log("SFT: Filters after conversion:", this.filters);
        }else{
            console.log("SFT: Custom filters provided:", Cf);
            if(this.query){
                console.log("SFT: Query exists, mapping custom filters");
                this.filters = Cf.map(f=>{
                    console.log("SFT: Mapping filter:", f, "Value:", this.query[f]);
                    return {[f]:this.query[f]};
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

        
        this.where = [...this.where, ...this.filters]

        console.log("SFT: this.where finallll",this.where);

        return this;
    }

    

    async get_execute(){

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

        if(this.offset>0){
            q.skip = this.offset;
        }

        console.log("SFT: q",q);

       

        this.data = await prisma[this.model].findMany(q);
        // this.data = [{id:1,name:"lol"}]
        return this;
    }

    return_execute(code=200){
        this.statusCode = code;
        this?.output?.send(this.data,this.statusCode);
        return this;
    }

    ///////////// execute /////////////

    
    ///////////// executer /////////////
    async execute(){
        

        for(let i=0; i<this.histories.length; i++){
            const history = this.histories[i];
            console.log(`===================== starting #${i} ${history.id} =====================`);


            const steps = history.history;
            for(let j=0; j<steps.length; j++){
                const step = steps[j];
                console.log(`FJS: step #${j}`);

                if(step.type=="filter"){
                    console.log(`FJS: step #${j} filter`,step.filters);
                    await this.filter_execute(step.input);
                }

                if(step.type=="get"){
                    console.log(`FJS: step #${j} get`);
                    await this.get_execute();
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
    async handle(req,res){
        this.input = req;
        this.query = this.getQuery(this.input);
        this.output = res;

        await this.execute();

        // this.return();
    }
    //////////master/////

}

export const e = (p)=>new Endpoint(p)
