// apiRoutes.js
import { e } from './apiBuilder.js';

const apiRoutes = [
  // Create product (POST request)
//   e("products/create")
//     .filter()  // No filters here, just create logic if necessary
//     .return(201),

//   // List products (GET request with filters and pagination)
//   e("products/list")
//     .filter(["name", "sku", "price"])  // Only allow filtering on these fields
//     .paginate()
//     .get()  // Fetch data based on filters and pagination
//     .return(200),

//   // Get a single product by ID (GET request)
//   e("products/get/:id")
//     .get()  // Fetch a single product based on the ID
//     .return(200),

//   // Update product by ID (PUT request)
  e("products/update/:id")
    .get()  // Fetch and update product logic
    // .return(200),

//   // Delete product by ID (DELETE request)
//   e("products/delete/:id")
//     .get()  // Logic for deleting product (typically not a simple GET, might need custom logic)
//     .return(200),
];

export default apiRoutes;
