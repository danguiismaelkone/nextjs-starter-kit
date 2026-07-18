"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface ProfileFormProps {
  name: string
  phone: string | null
  bio: string | null
}

/**
 * Champs Nom/Téléphone/Bio (ITEM-045), via `authClient.updateUser` (Better Auth).
 * Rendu sans wrapper `Card` : composé par le parent dans la section
 * « Utilisateur » de `/profile` (ITEM-083).
 */
export function ProfileForm({ name: initialName, phone: initialPhone, bio: initialBio }: ProfileFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone ?? "")
  const [bio, setBio] = useState(initialBio ?? "")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(false)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Le nom est requis.")
      return
    }

    setIsSubmitting(true)
    const { error: updateError } = await authClient.updateUser({
      name: trimmedName,
      phone: phone.trim() || null,
      bio: bio.trim() || null,
    })
    setIsSubmitting(false)

    if (updateError) {
      setError(updateError.message ?? "Une erreur est survenue.")
      return
    }

    setSuccess(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-name">Nom</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-phone">Téléphone</Label>
        <Input
          id="profile-phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+33 6 12 34 56 78"
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-bio">Bio</Label>
        <Textarea
          id="profile-bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Quelques mots sur vous..."
          rows={4}
          maxLength={500}
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {success && <p className="text-sm text-muted-foreground">Profil mis à jour.</p>}

      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  )
}
