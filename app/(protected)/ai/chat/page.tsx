import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { listConversationMessages } from "@/lib/ai-chat"
import { ChatPanel } from "@/components/ai/ChatPanel"
import { PageHeader } from "@/components/layout/PageHeader"

export default async function AiChatPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const messages = await listConversationMessages(session.user.id)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Assistant IA" description="Discutez avec l'assistant intégré à l'application." />

      <ChatPanel
        initialMessages={messages.map((message) => ({
          id: message.id,
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content,
        }))}
      />
    </div>
  )
}
