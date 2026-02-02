import { authMiddleware } from "@/middlewares/dependencies";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";


export const getSessionFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const headers = getRequestHeaders();
    const session = await context.auth.api.getSession({ headers });

    if (!session) {
      throw redirect({ to: "/login" });
    }

    return session;
  });