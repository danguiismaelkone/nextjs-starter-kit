"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Send, Sparkles } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface ChatMessageEntry {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatPanelProps {
  initialMessages: ChatMessageEntry[]
}

function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="L'assistant écrit">
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
    </span>
  )
}

/** Panneau de chat IA (ITEM-040) : historique persistant, envoi et affichage progressif (streaming) des réponses. */
export function ChatPanel({ initialMessages }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageEntry[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const content = input.trim()
    if (!content || isSending) return

    setError(null)
    setInput("")
    setIsSending(true)

    const userMessage: ChatMessageEntry = { id: `local-${Date.now()}`, role: "user", content }
    const assistantId = `local-${Date.now()}-assistant`
    setMessages((current) => [...current, userMessage, { id: assistantId, role: "assistant", content: "" }])

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      })

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}))
        setError(data.error ?? "Échec de l'envoi du message.")
        setMessages((current) => current.filter((message) => message.id !== assistantId))
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId ? { ...message, content: message.content + chunk } : message
          )
        )
      }
    } catch {
      setError("Échec de l'envoi du message.")
      setMessages((current) => current.filter((message) => message.id !== assistantId))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Card className="flex h-[calc(100vh-10rem)] flex-col">
      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8" />
              <p className="text-sm">Posez une question pour démarrer la conversation.</p>
            </div>
          )}

          <ul className="flex flex-col gap-4">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant"
              const isPending = isAssistant && isSending && message.content.length === 0

              return (
                <li key={message.id} className={cn("flex items-start gap-2", !isAssistant && "flex-row-reverse")}>
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className={cn(isAssistant && "bg-primary text-primary-foreground")}>
                      {isAssistant ? <Sparkles className="h-3.5 w-3.5" /> : "Moi"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                      isAssistant ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                    )}
                  >
                    {isPending ? <TypingIndicator /> : message.content}
                  </div>
                </li>
              )
            })}
          </ul>
          <div ref={scrollRef} />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écrivez votre message..."
            disabled={isSending}
            aria-label="Message"
          />
          <Button type="submit" size="icon-sm" disabled={isSending || !input.trim()} aria-label="Envoyer">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
