// EndpointManager.js

import Endpoint from "./EndpointsTransformer.js";


export default class EndpointManager {
  constructor() {
    this.apis = []; // List to store all registered APIs
  }

  // Method to register an endpoint automatically
  register(path) {
    const endpoint = new Endpoint(path); // Create a new endpoint instance
    this.apis.push(endpoint); // Add it to the apis list
    return endpoint; // Return the instance for chaining
  }

  // Method to get all registered endpoints
  getAll() {
    return this.apis;
  }

  // Method to find an endpoint by path
  findByPath(path) {
    return this.apis.find(api => api.path === path);
  }
}
