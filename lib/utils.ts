import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Jours restants avant `date` (0 si déjà passée). */
export function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000))
}

/** Chemin relatif interne uniquement — jamais une URL absolue/externe (open redirect). */
export function safeCallbackUrl(callbackUrl: string | undefined, fallback = "/dashboard"): string {
  if (callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) return callbackUrl
  return fallback
}
