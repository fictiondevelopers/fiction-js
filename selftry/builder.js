import { v4 as uuidv4 } from 'uuid';
import express from 'express';
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

    end(){
        this.histories.find(h=>h.id==this.activeHistory).completed = true;
        return this;
    }




    getQuery(input){
       const queryObject =  input.query;
       console.log("SFT: queryObject",queryObject);
       return queryObject;
    }

    filter(Cf=[]){

        if(Cf.length==0){
            this.filters = this.query || [];
        }else{
            this.filters = Cf;
        }


        console.log("SFT: this.filters",this.filters);

        this.where = this.filters.map(f=>{
            console.log("SFT: f",f);
            return {
                [f]:"lol"
            }
        });

        this.where = this.where.filter(w=>w!=null);

        
        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"filter",
            filters:this.filters
        });
        return this;
    }

    async get(){

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

       

        // this.data = await prisma[this.model].findMany(q);
        this.data = [{id:1,name:"lol"}]

        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"get",
            data:this.data
        });
        return this;
    }

    return(code=200){
        this.statusCode = code;

        this.histories.find(h=>h.id==this.activeHistory).history.push({
            type:"return",
            code:this.statusCode
        });

        this?.output?.send(this.data,this.statusCode);
        return this;
    }

    async handle(req,res){
        this.input = req.query;
        this.query = this.getQuery(this.input);
        this.output = res;
        this.start();
        this.filter();
        await this.get();
        this.end();
        this.return();
    }

}



const e = new Endpoint("products")

e.start()
e.filter(["name","sku"])
e.get()
e.end()
e.return(200)


const apiRoutes = [e];

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

apiRoutes.forEach(endpoint => {


    console.log(endpoint.method)
    app[endpoint.method || 'get']("/"+endpoint.path, async (req, res) => {
        console.log("I reached here")
        try {
            await endpoint.handle(req, res);
        } catch (error) {
            console.error('Error handling request:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

   
      
});

console.log(app._router.stack)

app.listen(3001,()=>{
    console.log("Server is running on port 3001");
});


