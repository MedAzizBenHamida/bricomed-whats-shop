import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, KeyRound, User as UserIcon } from "lucide-react";
import { ensureProfile, logActivity, setCachedUsername } from "@/lib/activity-log";

export function ProfileTab({ email, userId }: { email: string; userId: string }) {
  const [newEmail, setNewEmail] = useState(email);
  const [savingEmail, setSavingEmail] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [username, setUsername] = useState("");
  const [initialUsername, setInitialUsername] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    (async () => {
      const name = await ensureProfile(userId, email);
      setUsername(name);
      setInitialUsername(name);
    })();
  }, [userId, email]);

  const updateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = username.trim();
    if (!value) return toast.error("Nom d'utilisateur requis");
    if (value === initialUsername) return toast.info("Nom d'utilisateur identique");
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ username: value }).eq("id", userId);
    setSavingName(false);
    if (error) return toast.error(error.message);
    setCachedUsername(value);
    await logActivity({
      action: "Modification profil",
      entityType: "Administration",
      entityName: value,
      entityId: userId,
      oldValue: `Nom d'utilisateur: ${initialUsername}`,
      newValue: `Nom d'utilisateur: ${value}`,
    });
    setInitialUsername(value);
    toast.success("Nom d'utilisateur mis à jour");
  };

  const updateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail.trim() === email) return toast.info("Adresse identique");
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSavingEmail(false);
    if (error) return toast.error(error.message);
    await logActivity({
      action: "Modification profil",
      entityType: "Administration",
      entityName: username || email,
      entityId: userId,
      oldValue: `Email: ${email}`,
      newValue: `Email: ${newEmail.trim()} (en attente de confirmation)`,
    });
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
    await logActivity({
      action: "Changement de mot de passe",
      entityType: "Administration",
      entityName: username || email,
      entityId: userId,
    });
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
        <form onSubmit={updateUsername} className="mt-4 space-y-3">
          <div>
            <Label>Nom d'utilisateur (affiché dans le journal d'activité)</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex: aziz" />
          </div>
          <Button type="submit" variant="outline" disabled={savingName}>
            {savingName ? "Enregistrement…" : "Enregistrer le nom"}
          </Button>
        </form>
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
