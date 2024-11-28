const e = require("../src/core/EndpointsTransformer.js");

// let apis = []

// apis.push(
// e("products")
// .start()
// .filter(["name"])
// .filter(["sku"]) 
// .get()
// .end()
// .return(200)
// );

// apis.push(
// e("products/all")
// .start()
// .get()
// .end()
// .return(200)
// );

export const apiRoutes = apis;

module.exports = { apiRoutes: apis };