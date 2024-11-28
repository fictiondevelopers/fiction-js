// EndpointManager.js

import Endpoint from "./EndpointsTransformer.js";


export default class EndpointManager {
  constructor() {
    this.apis = []; // List to store all registered APIs
  }

  // Method to register an endpoint automatically
  register(path, method="get") {
    const endpoint = new Endpoint(path, method); // Create a new endpoint instance
    this.apis.push(endpoint); // Add it to the apis list
    return endpoint; // Return the instance for chaining
  }

  get(path){
    const endpoint = new Endpoint(path, "get");
    this.apis.push(endpoint);
    return endpoint;
  }

  post(path){
    const endpoint = new Endpoint(path, "post");
    this.apis.push(endpoint);
    return endpoint;
  }

  put(path){
    const endpoint = new Endpoint(path, "put");
    this.apis.push(endpoint);
    return endpoint;
  }

  delete(path){
    const endpoint = new Endpoint(path, "delete");
    this.apis.push(endpoint);
    return endpoint;
  }

  patch(path){
    const endpoint = new Endpoint(path, "patch");
    this.apis.push(endpoint);
    return endpoint;
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
