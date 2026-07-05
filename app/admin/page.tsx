import type { Metadata } from "next"
import Link from "next/link"
import {
  Mail,
  ShieldCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react"

import { requireAdmin } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StatCard } from "@/components/admin/stat-card"

export const metadata: Metadata = {
  title: "Administration",
  description: "Vue d'ensemble de l'espace d'administration.",
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
})

export default async function AdminPage() {
  // Redirects to /login (anonymous) or /dashboard (non-admin). The shell layout
  // guards too; kept here so the page is safe on its own.
  const admin = await requireAdmin()

  // "Pending" invitations exclude expired ones: status pending AND not past
  // expiry (same rule as ITEM-008, see lib/invitation.ts).
  const now = new Date()

  // All figures are read from the database — nothing hard-coded (AC).
  const [
    totalUsers,
    adminCount,
    disabledCount,
    pendingInvitations,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.user.count({ where: { disabledAt: { not: null } } }),
    prisma.invitation.count({
      where: { status: "pending", expiresAt: { gt: now } },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        disabledAt: true,
        createdAt: true,
      },
    }),
  ])

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">
          Bonjour {admin.name || admin.email}, voici l&apos;état des comptes.
        </p>
      </div>

      {/* Key figures — grid reflows to a single column on mobile. */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Utilisateurs" value={totalUsers} icon={Users} />
        <StatCard label="Admins" value={adminCount} icon={ShieldCheck} />
        <StatCard
          label="Comptes désactivés"
          value={disabledCount}
          icon={UserX}
        />
        <StatCard
          label="Invitations en attente"
          value={pendingInvitations}
          icon={Mail}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Raccourcis</CardTitle>
            <CardDescription>Accès rapide aux actions courantes.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/admin/users/new">
                <UserPlus className="size-4" />
                Nouvel utilisateur
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/users/invitations">
                <Mail className="size-4" />
                Inviter
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/users">
                <Users className="size-4" />
                Voir les utilisateurs
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Latest sign-ups */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Derniers utilisateurs</CardTitle>
            <CardDescription>
              Les {recentUsers.length || 5} comptes les plus récents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucun utilisateur pour le moment.
              </p>
            ) : (
              <ul className="divide-y">
                {recentUsers.map((user) => (
                  <li
                    key={user.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {user.name}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{user.role}</span>
                      {user.disabledAt ? (
                        <span className="text-destructive">Désactivé</span>
                      ) : (
                        <span className="text-muted-foreground">Actif</span>
                      )}
                      <span className="text-muted-foreground">
                        {dateFormatter.format(user.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
