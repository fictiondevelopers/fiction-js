

// const app = express();

// // Middleware to parse JSON bodies
// app.use(express.json());

// apiRoutes.forEach(endpoint => {


//     console.log(endpoint.method)
//     app[endpoint.method || 'get']("/"+endpoint.path, async (req, res) => {
//         console.log("I reached here")
//         try {
//             await endpoint.handle(req, res);
//         } catch (error) {
//             console.error('Error handling request:', error);
//             res.status(500).json({ error: 'Internal server error' });
//         }
//     });

   
      
// });

// console.log(app._router.stack)

// app.listen(3001,()=>{
//     console.log("Server is running on port 3001");
// });
