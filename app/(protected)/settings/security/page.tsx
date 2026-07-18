import { redirect } from "next/navigation"

/** 2FA/Sessions déplacés sur `/profile` (ITEM-084) — redirection pour ne pas casser les liens/favoris existants. */
export default function SecuritySettingsPage() {
  redirect("/profile")
}
