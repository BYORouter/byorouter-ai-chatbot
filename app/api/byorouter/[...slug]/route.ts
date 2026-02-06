import { createHandlers } from "@byorouter/next";
import { auth } from "@/app/(auth)/auth";
import { getUserConnectionId, updateUserConnectionId } from "@/lib/db/queries";

export const { GET, POST } = createHandlers({
  clientId: process.env.BYOROUTER_CLIENT_ID!,
  apiKey: process.env.BYOROUTER_API_KEY!,
  getUserId: async () => {
    const session = await auth();
    return session?.user?.id ?? null;
  },
  getConnectionId: async (userId) => getUserConnectionId(userId),
  setConnectionId: async (userId, connectionId) =>
    updateUserConnectionId(userId, connectionId),
});
