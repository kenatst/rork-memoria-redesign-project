import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { createPhotoProcedure } from "./routes/photos/create/route";
import { syncDataProcedure, getDataProcedure } from "./routes/photos/sync/route";
import { 
  createGroupProcedure, 
  joinGroupProcedure, 
  updateGroupCoverProcedure, 
  getGroupMembersProcedure 
} from "./routes/groups/manage/route";
import { 
  createAlbumProcedure, 
  updateAlbumCoverProcedure, 
  exportAlbumProcedure, 
  searchAlbumsProcedure 
} from "./routes/albums/manage/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  photos: createTRPCRouter({
    create: createPhotoProcedure,
    sync: syncDataProcedure,
    getData: getDataProcedure,
  }),
  groups: createTRPCRouter({
    create: createGroupProcedure,
    join: joinGroupProcedure,
    updateCover: updateGroupCoverProcedure,
    getMembers: getGroupMembersProcedure,
  }),
  albums: createTRPCRouter({
    create: createAlbumProcedure,
    updateCover: updateAlbumCoverProcedure,
    export: exportAlbumProcedure,
    search: searchAlbumsProcedure,
  }),
});

export type AppRouter = typeof appRouter;