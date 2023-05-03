import { createTRPCRouter } from "~/server/api/trpc";
import { youtubeRouter } from "~/server/api/routers/youtubeRouter";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  youtube: youtubeRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
