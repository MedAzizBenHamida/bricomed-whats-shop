import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, KeyRound, User as UserIcon } from "lucide-react";

export function ProfileTab({ email, userId }: { email: string; userId: string }) {
  const [newEmail, setNewEmail] = useState(email);
  const [savingEmail, setSavingEmail] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const updateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail.trim() === email) return toast.info("Adresse identique");
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSavingEmail(false);
    if (error) return toast.error(error.message);
    toast.success("Un email de confirmation a été envoyé à la nouvelle adresse.");
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("6 caractères minimum");
    if (pwd !== pwd2) return toast.error("Les mots de passe ne correspondent pas");
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSavingPwd(false);
    if (error) return toast.error(error.message);
    setPwd("");
    setPwd2("");
    toast.success("Mot de passe mis à jour");
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-xl border bg-card p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <UserIcon className="h-4 w-4 text-primary" /> Compte
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">Rôle : administrateur</p>
        <p className="mt-1 break-all text-xs text-muted-foreground">
          Identifiant : <code className="rounded bg-secondary px-1.5 py-0.5">{userId}</code>
        </p>
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Mail className="h-4 w-4 text-primary" /> Adresse email
        </h2>
        <form onSubmit={updateEmail} className="mt-4 space-y-3">
          <div>
            <Label>Email</Label>
            <Input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </div>
          <Button type="submit" disabled={savingEmail}>
            {savingEmail ? "Envoi…" : "Modifier l'email"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Un lien de confirmation sera envoyé à la nouvelle adresse.
          </p>
        </form>
      </section>

      <section className="rounded-xl border bg-card p-6 md:col-span-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <KeyRound className="h-4 w-4 text-primary" /> Mot de passe
        </h2>
        <form onSubmit={updatePassword} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nouveau mot de passe</Label>
            <Input type="password" required value={pwd} onChange={(e) => setPwd(e.target.value)} />
          </div>
          <div>
            <Label>Confirmer</Label>
            <Input type="password" required value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={savingPwd}>
              {savingPwd ? "Enregistrement…" : "Changer le mot de passe"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
