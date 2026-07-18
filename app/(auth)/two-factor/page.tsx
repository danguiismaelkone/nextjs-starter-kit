import { safeCallbackUrl } from "@/lib/utils"
import { TwoFactorVerifyForm } from "./TwoFactorVerifyForm"

interface TwoFactorPageProps {
  searchParams: Promise<{ callbackUrl?: string }>
}

export default async function TwoFactorPage({ searchParams }: TwoFactorPageProps) {
  const { callbackUrl } = await searchParams
  const destination = safeCallbackUrl(callbackUrl)

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <TwoFactorVerifyForm callbackUrl={destination} />
    </div>
  )
}
