import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Espace administrateur — BricoMed" },
      { name: "description", content: "Connexion à l'espace d'administration BricoMed." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/admin" });
    });
  }, [nav]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Connecté");
    nav({ to: "/admin" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Compte créé. Il doit être approuvé par un super administrateur avant l'accès.");
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setResetSent(true);
    toast.success("Lien de réinitialisation envoyé. Vérifiez votre boîte mail.");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6 text-center">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold">Espace administrateur</h1>
        <p className="mt-1 text-sm text-muted-foreground">Réservé à l'équipe BricoMed</p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-card">
        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signin">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Créer</TabsTrigger>
            <TabsTrigger value="reset">Mot de passe oublié</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-4 pt-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pw">Mot de passe</Label>
                <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" disabled={loading}>Se connecter</Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-4 pt-4">
              <div>
                <Label htmlFor="email2">Email</Label>
                <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pw2">Mot de passe</Label>
                <Input id="pw2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" disabled={loading}>Créer le compte</Button>
              <p className="text-xs text-muted-foreground">
                Votre compte sera créé avec le statut « En attente d'approbation ». Un super administrateur doit le valider avant que vous puissiez accéder au tableau de bord.
              </p>
            </form>
          </TabsContent>
          <TabsContent value="reset">
            {resetSent ? (
              <div className="space-y-4 pt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Un email de réinitialisation a été envoyé à <strong>{email}</strong>.
                </p>
                <p className="text-xs text-muted-foreground">Vérifiez votre boîte de réception et vos spams.</p>
              </div>
            ) : (
              <form onSubmit={resetPassword} className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="email3">Email du compte</Label>
                  <Input id="email3" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button className="w-full" disabled={loading}>Envoyer le lien de réinitialisation</Button>
                <p className="text-xs text-muted-foreground">
                  Vous recevrez un email avec un lien pour définir un nouveau mot de passe.
                </p>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
