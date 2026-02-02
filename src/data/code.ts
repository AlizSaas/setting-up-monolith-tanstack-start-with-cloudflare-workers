// import { createServerFn } from "@tanstack/react-start";
// import { nanoid } from "nanoid";
// import { code } from "@/db/schema";

// import { desc, eq, and } from "drizzle-orm";
// import { z } from "zod";
// import { authMiddleware } from "@/middlewares/dependencies";

// // Helper to get KV key for user's codes
// const getCodesKey = (userId: string) => `codes:${userId}`;
// export const generateCodeFn = createServerFn({ method: "POST" })
//   .middleware([authMiddleware])
//   .handler(async ({ context }) => {
//     const { db, user, env,waitUntil} = context;

//     const uniqueCode = nanoid(10);
//     const codeId = nanoid();

//     const [newCode] = await db
//       .insert(code)
//       .values({
//         id: codeId,
//         code: uniqueCode,
//         userId: user.id,
//         status: "pending",
//         aiGenerated: false,
//         emailSend: false,
        
//       })
//       .returning();

//     // Invalidate KV cache
//     await env.KV.delete(getCodesKey(user.id));

//     // Send message to queue
  
// waitUntil(env.MY_QUEUE.send({
//   type: "CODE_GENERATED",
//   codeId: codeId,         // ← flat structure
//   userId: user.id,
//   code: uniqueCode,

//   status: newCode.status,
//   aiGenerated: newCode.aiGenerated,
//         emailSend: newCode.emailSend
  

// }));

//     console.log("Message sent to queue:", { codeId, userId: user.id });

//     return newCode;
//   });



// export const getCodesFn = createServerFn({ method: "GET" })
//   .middleware([authMiddleware])
//   .handler(async ({ context }): Promise<{
//     id: string;
//     code: string;
//     createdAt: Date;
//     status: "pending" | "success";
//   }[]> => {
//     const { db, user, env } = context;

//     const cacheKey = getCodesKey(user.id);

//     // 1. Check KV first
//     const cached = await env.KV.get(cacheKey);
//     if (cached) {
//       console.log("Cache HIT - returning from KV");
//       return JSON.parse(cached);
//     }

//     console.log("Cache MISS - fetching from DB");

//     // 2. Not in KV, fetch from DB
//     const codes = await db
//       .select({
//         id: code.id,
//         code: code.code,
//         createdAt: code.createdAt,
//         status: code.status,
//       })
//       .from(code)
//       .where(eq(code.userId, user.id))
//       .orderBy(desc(code.createdAt));

//     // 3. Save to KV (cache for 5 minutes)
//     await env.KV.put(cacheKey, JSON.stringify(codes), {
//       expirationTtl: 60 * 5,
//     });

//     return codes;
//   });

// export const deleteCodeFn = createServerFn({ method: "POST" })
//   .middleware([authMiddleware])
//   .inputValidator(z.object({ codeId: z.string() }))
//   .handler(async ({ context, data }) => {
//     const { db, user, env } = context;

//     await db
//       .delete(code)
//       .where(
//         and(
//           eq(code.id, data.codeId),
//           eq(code.userId, user.id)
//         )
//       );

//     // Invalidate KV cache
//     await env.KV.delete(getCodesKey(user.id));

//     return { success: true };
//   });