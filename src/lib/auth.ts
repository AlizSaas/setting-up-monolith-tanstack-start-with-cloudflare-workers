import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { type Database } from "../db";
import * as schema from "../db/schema";
import { createBetterAuth } from "./setup";

let _auth: ReturnType<typeof createBetterAuth>;

export type AuthConfig = {
  secret: string;
  adapter: {
    drizzleDb: Database;
    provider: "pg";
  };
  socialProviders?: {
    google?: {
      clientId: string;
      clientSecret: string;
    };
    
  };
    sendResetPassword?: (data: {
    email: string;
    url: string;
  }) => Promise<void>;

};

export function setAuth(config: AuthConfig) {
  _auth = createBetterAuth({
    database: drizzleAdapter(config.adapter.drizzleDb, {
      provider: config.adapter.provider,
      schema: {
        auth_user: schema.user,
        auth_session: schema.session,
        auth_account: schema.account,
        auth_verification: schema.verification,
      },
    }),
    secret: config.secret,
    socialProviders: config.socialProviders,
    
    sendResetPassword: config.sendResetPassword
    
    
  });
  return _auth;
}

export function getAuth() {
  if (!_auth) {
    throw new Error("Auth not initialized");
  }
  return _auth;
}

export type Auth = ReturnType<typeof createBetterAuth>;