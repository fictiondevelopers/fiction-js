import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadRoutes() {
    const routes = [];
    const files = readdirSync(__dirname).filter(file => 
        file !== 'index.js' && file.endsWith('.js')
    );

    for (const file of files) {
        const module = await import(join(__dirname, file));
        if (module.apiRoutes) {
            routes.push(...module.apiRoutes);
        }
    }
    
    return routes;
}

export default loadRoutes;
