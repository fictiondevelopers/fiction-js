import EndpointManager from "../src/core/EndpointManager.js";

// Create an instance of the EndpointManager
const e = new EndpointManager();

// Register the "products" API route
e.register("products")
    .start()
    .filter() // only provide the filters that you want to force, optional filters can be sent via query params
    
    .get({limit:100}) // default limit is 10, you can override it here, you can also override the offset
    .end()
    .return(200);


    e.register("products/one")
    .start()
    .filter(["id"]) // only provide the filters that you want to force, optional filters can be sent via query params
    .get() // default limit is 10, you can override it here, you can also override the offset
    .end()
    .return(200);


    e.register("products/mine")
    .start()
    .auth({roles:["user"], permissions:["users.update.all"]})
    .mera()
    .get()
    .end()
    .return(200);

    e.post("products/update")
    .start()
    .auth()
    .mera()
    .filter(["id"])
    .update()
    .end()
    .return(200);

    e.delete("products/delete")
    .start()
    .auth()
    .mera()
    .filter(["id"])
    .delete()
    .end()
    .return(200);



    e.post("products/create")
    .start()
    .auth()
    .mera()
    .validate({id:"auto"})
    .create()
    .end()
    .start()
    .auth()
    .mera()
    .get()
    .end()
    .return(200);


// // Register the "users" API route
// e.register("users")
//     .start()
//     .filter(["email"])
//     .get()
//     .end()
//     .return(200);

// Now you can access all registered routes from `e.apis`
export const apiRoutes = e.getAll();
