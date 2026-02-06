import { cookies } from "next/headers";

import { Chat } from "@/components/chat";
import { DEFAULT_CHAT_MODEL, DEFAULT_CHAT_PROVIDER } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { auth } from "../(auth)/auth";
import { redirect } from "next/navigation";
import { getUserConnectionId } from "@/lib/db/queries";
import { isTestEnvironment } from "@/lib/constants";
import { BYORouter } from "@byorouter/node";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  const id = generateUUID();

  // In test environment, skip connection check (uses mock provider)
  const connectionId = isTestEnvironment
    ? null
    : await getUserConnectionId(session.user.id);
  const hasConnection = isTestEnvironment ? true : !!connectionId;

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");
  const providerIdFromCookie = cookieStore.get("chat-provider");

  const initialProvider = providerIdFromCookie?.value ?? DEFAULT_CHAT_PROVIDER;
  const initialModel = modelIdFromCookie?.value ?? DEFAULT_CHAT_MODEL;

  // Fetch provider display name from API
  let initialProviderDisplayName = initialProvider;
  if (connectionId && !isTestEnvironment) {
    try {
      const client = new BYORouter({ apiKey: process.env.BYOROUTER_API_KEY! });
      const providers = await client.getProviders(connectionId);
      const provider = providers.find((p) => p.provider === initialProvider);
      if (provider) {
        initialProviderDisplayName = provider.displayName;
      }
    } catch {
      // Fallback to raw provider ID on error
    }
  }

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        initialChatModel={initialModel}
        initialChatProvider={initialProvider}
        initialProviderDisplayName={initialProviderDisplayName}
        initialVisibilityType="private"
        isReadonly={false}
        session={session}
        autoResume={false}
        hasConnection={hasConnection}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
