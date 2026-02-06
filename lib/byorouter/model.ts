import { getUserConnectionId } from "@/lib/db/queries";
import { isTestEnvironment } from "@/lib/constants";
import { myProvider } from "@/lib/ai/providers";
import { getByorouterProvider } from "@/lib/ai/byorouter";
import { ChatSDKError } from "@/lib/errors";

type Session = { user?: { id: string } };

export async function requireConnectionId(session: Session): Promise<string> {
  if (isTestEnvironment) {
    throw new Error("requireConnectionId should not be called in test env");
  }

  const userId = session?.user?.id;
  if (!userId) {
    throw new ChatSDKError("unauthorized:chat");
  }

  const connectionId = await getUserConnectionId(userId);
  if (!connectionId) {
    throw new ChatSDKError("forbidden:chat");
  }

  return connectionId;
}

export async function getModel(session: Session, modelId: string) {
  if (!modelId || !modelId.includes("/")) {
    throw new ChatSDKError("bad_request:api");
  }

  if (isTestEnvironment) {
    if (!myProvider) {
      throw new Error("myProvider not initialized in test environment");
    }
    return myProvider.languageModel(modelId);
  }

  const connectionId = await requireConnectionId(session);
  const provider = getByorouterProvider(connectionId);
  return provider(modelId);
}
