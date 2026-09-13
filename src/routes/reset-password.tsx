import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Réinitialiser le mot de passe — BricoMed" },
      { name: "description", content: "Définissez un nouveau mot de passe pour votre compte BricoMed." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setRecoveryMode(true);
    } else {
      toast.error("Lien de réinitialisation invalide ou expiré.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error("Les mots de passe ne correspondent pas.");
    }
    if (password.length < 6) {
      return toast.error("Le mot de passe doit contenir au moins 6 caractères.");
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      return toast.error(error.message);
    }

    setDone(true);
    toast.success("Mot de passe mis à jour avec succès.");
    setTimeout(() => nav({ to: "/auth" }), 2000);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6 text-center">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold">Nouveau mot de passe</h1>
        <p className="mt-1 text-sm text-muted-foreground">Définissez un mot de passe sécurisé</p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-card">
        {done ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="text-lg font-semibold">Mot de passe mis à jour</p>
            <p className="text-sm text-muted-foreground">Redirection vers la page de connexion...</p>
          </div>
        ) : recoveryMode ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button className="w-full" disabled={loading}>
              Mettre à jour le mot de passe
            </Button>
          </form>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Ce lien n'est pas valide. Veuillez demander un nouveau lien de réinitialisation.
          </p>
        )}
      </div>
    </div>
  );
}
