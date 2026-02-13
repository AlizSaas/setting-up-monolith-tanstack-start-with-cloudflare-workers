import { createMiddleware } from "@tanstack/react-start";
import { getAuth } from "../lib/auth";
import { getDb } from "@/db";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import * as Sentry from "@sentry/cloudflare";

export const dependencyMiddleware = createMiddleware({}).server(
  async ({ next, context }) => {
    const db = getDb();
    const auth = getAuth();

    return next({
      context: {
        ...context,
        db,
        auth,
      },
    });
  }
);

export const authMiddleware = createMiddleware()
  .middleware([dependencyMiddleware])
  .server(async ({ next, context }) => {
    const headers = getRequestHeaders();
    const session = await context.auth.api.getSession({ headers });

    if (!session) {
      throw redirect({ to: "/login" });
    }

    // ✅ Set user context so errors are tagged with user info
    Sentry.setUser({
      id: session.user.id,
    
    });

    return next({
      context: {
        ...context,
        session,
        user: session.user,
      },
    });
  });

export const publicMiddleware = createMiddleware({}).middleware([dependencyMiddleware]).server(
  async ({ next }) => {
    return next();
  }
);