import { redirect } from "next/navigation"

/**
 * Invitations moved into the unified Users page as a tab (ITEM-015). This route
 * is kept as a permanent redirect so old links (dashboard, emails, bookmarks)
 * still land on the Invitations tab instead of a dead page.
 */
export default function InvitationsRedirectPage() {
  redirect("/admin/users?tab=invitations")
}
