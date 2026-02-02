
import { clients } from "@/db/schema";
import { authMiddleware } from "@/middlewares/dependencies";
import { createServerFn } from "@tanstack/react-start";
 import { desc, eq, and } from "drizzle-orm";
import z from "zod";
import { nanoid } from 'nanoid'
import { createClientSchema } from "@/lib/schema.type";

export const createClientFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(createClientSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { name, email, company, address, notes } = data;

    const clientId = nanoid();
    const now = new Date();

    // Insert the new client
    await db.insert(clients).values({
      id: clientId,
      userId: user.id,
      name,
      email,
      company: company || null,
      address: address || null,
      notes: notes || null,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });

    // Fetch the created client
    const [newClient] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!newClient) {
      throw new Error("Failed to create client");
    }

    // Optional: Track analytics
    // const analytics = new AnalyticsService();
    // analytics.trackClientCreated(user.id, clientId);

    return newClient;
  });













export const getClientsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      archived: z.boolean().optional().default(false),
    })
  )
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { archived } = data;

    const allClients = await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.userId, user.id),
          eq(clients.archived, archived)
        )
      )
      .orderBy(desc(clients.createdAt));

    return allClients;
  });

  export const getClientByIdFn = createServerFn({ method: "GET" }).middleware([authMiddleware]).inputValidator(z.object({
    id: z.string(),
  })).handler(async ({context, data}) => {
    const {db, user, } = context;

    const [client]  = await db.select()
    .from(clients).where(and(
      eq(clients.id, data.id), // find the client by its ID
      eq(clients.userId, user.id) // ensure the client belongs to the authenticated user
    )).limit(1)

    if(!client) {
      throw new Error("Client not found or you do not have permission to view it.");
    }
    return client

  })
  

  export const archiveClientFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).inputValidator(z.object({
    id: z.string(),
  
  })).handler(async ({context,data}) =>{

    const {db, user, } = context;
    const { id } = data;
    const existingClient  = await db.select().from(clients).where(and(
      eq(clients.id, id), // find the client by its ID
      eq(clients.userId, user.id) // ensure the client belongs to the authenticated user
    )).limit(1)

    if(!existingClient) {
      throw new Error("Client not found or you do not have permission to archive it.");
    }
  // Archive the client
    await db
      .update(clients)
      .set({
        archived: true,
        updatedAt: new Date(), // ← Good practice to update timestamp
      })
      .where(
        and(
          eq(clients.id, id),
          eq(clients.userId, user.id) // ← Keep this for security
        )
      );

         return { id, message: "Client archived", };


   })

   export const restoreClientFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).inputValidator(z.object({
    id: z.string(),
  })).handler(async ({context,data}) =>{

    const {db, user, } = context;
    const { id } = data;
    const existingClient  = await db.select().from(clients).where(and(
      eq(clients.id, id), // find the client by its ID
      eq(clients.userId, user.id) // ensure the client belongs to the authenticated user
    )).limit(1)
    if(!existingClient) {
      throw new Error("Client not found or you do not have permission to restore it.");
    }
  // Restore the client
    await db
      .update(clients)
      .set({
        archived: false,
        updatedAt: new Date(), // ← Good practice to update timestamp
      })
      .where(
        and(
          eq(clients.id, id),
          eq(clients.userId, user.id) // ← Keep this for security
        )
      );
          return { id, message: "Client restored" };
    })

    export const updateClientFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).inputValidator(z.object({
      id: z.string(),
      data: createClientSchema.partial(),
    })).handler(async ({context, data}) => {
      const {db, user} = context;
      const {id, data: clientData} = data;
      
      // Check client exists and belongs to user
      const [existingClient] = await db.select().from(clients).where(and(
        eq(clients.id, id),
        eq(clients.userId, user.id)
      )).limit(1);
      
      if(!existingClient) {
        throw new Error("Client not found or you do not have permission to update it.");
      }
      
      // Build dynamic update object - only include defined fields
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };
      
      if(clientData.name !== undefined) updateData.name = clientData.name;
      if(clientData.email !== undefined) updateData.email = clientData.email;
      if(clientData.company !== undefined) updateData.company = clientData.company || null;
      if(clientData.address !== undefined) updateData.address = clientData.address || null;
      if(clientData.notes !== undefined) updateData.notes = clientData.notes || null;
      
      await db.update(clients).set(updateData).where(and(
        eq(clients.id, id),
        eq(clients.userId, user.id)
      ));
      
      // Fetch and return updated client
      const [updatedClient] = await db.select().from(clients).where(
        eq(clients.id, id)
      ).limit(1);
      
      return updatedClient;
    })