import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { createPhotoProcedure } from "./routes/photos/create/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  photos: createTRPCRouter({
    create: createPhotoProcedure,
  }),
});

export type AppRouter = typeof appRouter;