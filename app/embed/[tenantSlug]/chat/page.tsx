import { ChatEmbedRuntime } from "@/components/chat-widget/embed-runtime";

type Props = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function EmbedChatPage({ params }: Props) {
  const { tenantSlug } = await params;
  return (
    <main className="min-h-screen bg-transparent">
      <ChatEmbedRuntime tenantSlug={tenantSlug} />
    </main>
  );
}
