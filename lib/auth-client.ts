import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";
import { ssoClient } from "@better-auth/sso/client";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  // Pas de `onTwoFactorRedirect`/`twoFactorPage` : la redirection est gérée
  // explicitement au point d'appel (`LoginForm.tsx`, ITEM-046), cohérent avec
  // le reste de l'app qui ne centralise pas la gestion des réponses `authClient`.
  // `adminClient` (ITEM-050) : impersonation depuis la console super-admin —
  // `authClient.admin.impersonateUser`/`stopImpersonating` posent le cookie de
  // session dans le navigateur, ce qui n'est possible que côté client.
  // `ssoClient` (ITEM-065) : `domainVerification` non activé (voir lib/auth.ts).
  plugins: [inferAdditionalFields<typeof auth>(), twoFactorClient(), adminClient(), ssoClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
