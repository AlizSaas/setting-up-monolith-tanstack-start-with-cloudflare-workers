import handler from "@tanstack/react-start/server-entry";

import { createDb, getDb } from "./db";
import {  setAuth } from "./lib/auth";








export default {
  fetch(request: Request, env: Env, executionCtx: ExecutionContext) {
    // Initialize db first - available via getDb()
    createDb(env.DATABASE_URL);
setAuth({
  secret: env.BETTER_AUTH_SECRET,
  adapter:{
    drizzleDb: getDb(),
    provider: "pg",
  }
})
    

    return handler.fetch(request, {
      context: {
              env,
      waitUntil: executionCtx.waitUntil.bind(executionCtx),    
        fromFetch: true,
        

      },
      
      



    });

  

    
  },

  
};
