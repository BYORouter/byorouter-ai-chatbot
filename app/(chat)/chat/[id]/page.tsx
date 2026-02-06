import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat } from "@/components/chat";
import {
  getChatById,
  getMessagesByChatId,
  getUserConnectionId,
} from "@/lib/db/queries";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL, DEFAULT_CHAT_PROVIDER } from "@/lib/ai/models";
import { isTestEnvironment } from "@/lib/constants";
import type { DBMessage } from "@/lib/db/schema";
import type { Attachment, UIMessage } from "ai";
import { BYORouter } from "@byorouter/node";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  if (chat.visibility === "private") {
    if (!session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  // In test environment, skip connection check (uses mock provider)
  const connectionId = isTestEnvironment
    ? null
    : await getUserConnectionId(session.user.id);
  const hasConnection = isTestEnvironment ? true : !!connectionId;

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  function convertToUIMessages(messages: Array<DBMessage>): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage["parts"],
      role: message.role as UIMessage["role"],
      // Note: content will soon be deprecated in @ai-sdk/react
      content: "",
      createdAt: message.createdAt,
      experimental_attachments:
        (message.attachments as Array<Attachment>) ?? [],
    }));
  }

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");
  const providerIdFromCookie = cookieStore.get("chat-provider");

  const initialProvider = providerIdFromCookie?.value ?? DEFAULT_CHAT_PROVIDER;
  const initialModel = chatModelFromCookie?.value ?? DEFAULT_CHAT_MODEL;

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
        id={chat.id}
        initialMessages={convertToUIMessages(messagesFromDb)}
        initialChatModel={initialModel}
        initialChatProvider={initialProvider}
        initialProviderDisplayName={initialProviderDisplayName}
        initialVisibilityType={chat.visibility}
        isReadonly={session?.user?.id !== chat.userId}
        session={session}
        autoResume={true}
        hasConnection={hasConnection}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
