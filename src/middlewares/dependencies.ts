import { createMiddleware } from "@tanstack/react-start";
import {  getAuth } from "../lib/auth";
import { getDb } from "@/db";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";

export const dependencyMiddleware = createMiddleware({}).server(
  async ({ next, context }) => {
    const db = getDb();
    const auth = getAuth();

    return next({
      context: {
        ...context, // <<— retains env + waitUntil
        db,
        auth,
      },
    });
  }
); // dependencyMiddleware

export const authMiddleware = createMiddleware()
  .middleware([dependencyMiddleware])
  .server(async ({ next, context }) => {
    const headers = getRequestHeaders();
    const session = await context.auth.api.getSession({ headers });

    if (!session) {
      throw redirect({ to: "/login" });
    } // if no session, redirect to login

    return next({
      context: {
        ...context,
        session,
        user: session.user,
      },
    });
  }); 