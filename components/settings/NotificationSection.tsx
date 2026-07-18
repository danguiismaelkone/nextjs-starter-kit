"use client"

import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateNotificationPreferenceAction } from "@/app/(protected)/settings/actions"
import type { CategoryPreference } from "@/lib/notification-preferences"
import type { NotificationCategory, NotificationChannel } from "@/lib/notification-templates"

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: "E-mail",
  push: "Push",
  inApp: "In-app",
}

interface NotificationSectionProps {
  preferences: CategoryPreference[]
}

function toggleChannel(
  preferences: CategoryPreference[],
  category: NotificationCategory,
  channel: NotificationChannel,
  enabled: boolean
): CategoryPreference[] {
  return preferences.map((pref) =>
    pref.category === category
      ? { ...pref, channels: pref.channels.map((c) => (c.channel === channel ? { ...c, enabled } : c)) }
      : pref
  )
}

/** Section « Notifications » de `/settings` (ITEM-038) : switches par canal et par catégorie d'évènement. */
export function NotificationSection({ preferences: initialPreferences }: NotificationSectionProps) {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [isPending, startTransition] = useTransition()

  function handleToggle(category: NotificationCategory, channel: NotificationChannel, enabled: boolean) {
    setPreferences((current) => toggleChannel(current, category, channel, enabled))

    startTransition(async () => {
      const result = await updateNotificationPreferenceAction(category, channel, enabled)
      if (result.error) {
        setPreferences((current) => toggleChannel(current, category, channel, !enabled))
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Choisissez les types de notifications que vous recevez et par quel canal.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {preferences.map((pref) => (
          <div key={pref.category} className="flex flex-col gap-3 border-b pb-6 last:border-b-0 last:pb-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{pref.label}</p>
              {pref.critical && <Badge variant="outline">Toujours actif</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{pref.description}</p>

            <div className="flex flex-col gap-3">
              {pref.channels.map((channelPref) => {
                const id = `${pref.category}-${channelPref.channel}`
                return (
                  <div key={channelPref.channel} className="flex items-center justify-between gap-4">
                    <Label htmlFor={id} className="text-sm font-normal text-foreground">
                      {CHANNEL_LABELS[channelPref.channel]}
                    </Label>
                    <Switch
                      id={id}
                      checked={channelPref.enabled}
                      disabled={pref.critical || isPending}
                      onCheckedChange={(checked) => handleToggle(pref.category, channelPref.channel, checked)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
