import { prisma } from "@/lib/prisma"

/**
 * Couche de données du chat IA (ITEM-040) : un seul fil de discussion par
 * utilisateur, créé à la volée au premier message.
 */
export async function getOrCreateConversation(userId: string) {
  const existing = await prisma.conversation.findFirst({ where: { userId } })
  if (existing) return existing

  return prisma.conversation.create({ data: { userId } })
}

/** Historique complet du fil de l'utilisateur, du plus ancien au plus récent. */
export async function listConversationMessages(userId: string) {
  const conversation = await prisma.conversation.findFirst({ where: { userId } })
  if (!conversation) return []

  return prisma.chatMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  })
}

export async function appendMessage(conversationId: string, role: "user" | "assistant", content: string) {
  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({ data: { conversationId, role, content } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ])
  return message
}
