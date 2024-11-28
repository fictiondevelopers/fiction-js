import EndpointManager from "../src/core/EndpointManager.js";

// Create an instance of the EndpointManager
const e = new EndpointManager();

// Register the "products" API route
e.register("products")
    .start()
    .filter(["name"])
    .filter(["sku"])
    .get()
    .end()
    .return(200);

// Register the "users" API route
e.register("users")
    .start()
    .filter(["email"])
    .get()
    .end()
    .return(200);

// Now you can access all registered routes from `e.apis`
export const apiRoutes = e.getAll();
