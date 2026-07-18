import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  LifeBuoy,
  Mail,
  MessageCircle,
  Settings,
  Sparkles,
  UserCircle,
  Users,
} from "lucide-react"

export interface HighlightItem {
  title: string
  tags: string[]
  href: string
  icon: LucideIcon
}

export interface ResourceItem {
  title: string
  description: string
  href: string
  icon: LucideIcon
}

/** Contenu temporaire — à remplacer par les vraies offres/fonctionnalités du produit. */
export const highlights: HighlightItem[] = [
  { title: "Gérer les utilisateurs", tags: ["Admin"], href: "/admin/users", icon: Users },
  { title: "Invitations", tags: ["Admin", "Email"], href: "/admin/invitations", icon: Mail },
  { title: "Mon profil", tags: ["Compte"], href: "/profile", icon: UserCircle },
  { title: "Paramètres", tags: ["Compte"], href: "/settings", icon: Settings },
]

/** Contenu temporaire — à remplacer par les vraies ressources du produit. */
export const resources: ResourceItem[] = [
  {
    title: "Documentation",
    description: "Découvrez comment tirer parti de toutes les fonctionnalités.",
    href: "#",
    icon: BookOpen,
  },
  {
    title: "Support",
    description: "Contactez notre équipe pour toute question.",
    href: "#",
    icon: LifeBuoy,
  },
  {
    title: "Nouveautés",
    description: "Consultez les dernières mises à jour du produit.",
    href: "#",
    icon: Sparkles,
  },
  {
    title: "Communauté",
    description: "Échangez avec d'autres utilisateurs.",
    href: "#",
    icon: MessageCircle,
  },
]
