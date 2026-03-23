import { StreamChat } from 'stream-chat';

let streamClient: StreamChat | null = null;

export function getStreamClient() {
  if (!streamClient) {
    streamClient = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_API_KEY!);
  }
  return streamClient;
}

export async function connectStreamUser(
  userId: string,
  username: string,
  avatarUrl?: string,
  token?: string
) {
  const client = getStreamClient();

  if (client.userID) {
    return client;
  }

  await client.connectUser(
    {
      id: userId,
      name: username,
      image: avatarUrl || `https://getstream.io/random_svg/?name=${username}`,
    },
    token
  );

  return client;
}

export async function disconnectStream() {
  if (streamClient?.userID) {
    await streamClient.disconnectUser();
  }
}
