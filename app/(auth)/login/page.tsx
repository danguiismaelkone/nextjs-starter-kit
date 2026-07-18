import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { safeCallbackUrl } from "@/lib/utils"
import { LoginForm } from "./LoginForm"

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams
  const destination = safeCallbackUrl(callbackUrl)

  const session = await getSession()
  if (session?.user) redirect(destination)

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <LoginForm callbackUrl={destination} />
    </div>
  )
}
