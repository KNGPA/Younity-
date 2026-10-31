// Outils partagés par les fonctions serveur Younity.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export const URL_SUPABASE = Deno.env.get("SUPABASE_URL")!;
const CLE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const CLE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-installation-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function reponse(corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), { status: statut, headers: { ...cors, "Content-Type": "application/json" } });
}

export class ErreurMetier extends Error {
  constructor(message: string, public statut = 400) { super(message); }
}

/** Client qui agit AVEC LES DROITS de la personne connectée (les règles RLS s'appliquent). */
export function clientUtilisateur(req: Request): SupabaseClient {
  const auth = req.headers.get("Authorization");
  if (!auth) throw new ErreurMetier("Connexion requise", 401);
  return createClient(URL_SUPABASE, CLE_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
}

/** Client serveur (clé service_role) : ne quitte jamais le serveur. */
export function clientAdmin(): SupabaseClient {
  return createClient(URL_SUPABASE, CLE_SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Appelle une fonction SQL et transforme son erreur en message lisible. */
export async function rpc<T>(c: SupabaseClient, nom: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await c.rpc(nom, params);
  if (error) throw new ErreurMetier(error.message);
  return data as T;
}

/** Mot de passe provisoire lisible : 3 groupes, sans caractères ambigus (0/O, 1/l/I). */
export function motDePasseProvisoire(): string {
  const lettres = "abcdefghjkmnpqrstuvwxyz", chiffres = "23456789";
  const tire = (s: string, n: number) => {
    const t = crypto.getRandomValues(new Uint32Array(n));
    return Array.from(t, (x) => s[x % s.length]).join("");
  };
  return `${tire(lettres, 4)}-${tire(chiffres, 4)}-${tire(lettres, 2)}`;
}

/** Enveloppe commune : CORS, POST uniquement, erreurs propres. */
export function servir(gestion: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return reponse({ erreur: "Méthode non autorisée" }, 405);
    try {
      return await gestion(req);
    } catch (e) {
      if (e instanceof ErreurMetier) return reponse({ erreur: e.message }, e.statut);
      console.error(e);
      return reponse({ erreur: "Erreur inattendue. Réessaie dans un instant." }, 500);
    }
  });
}
