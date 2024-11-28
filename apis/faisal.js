// const e = require("../src/core/EndpointsTransformer.js");

import Endpoint from "../src/core/EndpointsTransformer.js";

let apis = []

const e = new Endpoint("products")
e.start()
e.filter(["name"])
e.filter(["sku"]) 
e.get()
e.end()
e.return(200)

apis.push(e)


export const apiRoutes = apis;

