import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Facebook, Mail, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !acceptTerms) {
      toast({
        title: "AGB erforderlich",
        description: "Bitte akzeptiere die AGB und Datenschutzerklärung.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/matching");
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          navigate("/profile-setup");
        } else {
          toast({
            title: "Bestätigungs-E-Mail gesendet",
            description: "Bitte überprüfe dein Postfach und klicke den Bestätigungslink.",
          });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "google" | "facebook") => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/profile-setup`,
        },
      });
      if (error) throw error;
      // Kein setLoading(false) hier – Browser redirectet zur OAuth-Seite
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="text-3xl font-bold text-orange-500 mb-8">
        ride<span className="text-white">2</span>gether
      </div>

      <Card className="bg-gray-900 border-gray-800 max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center text-2xl text-white">
            {isLogin ? "Anmelden" : "Registrieren"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Social Login */}
          <div className="space-y-3">
            <Button
              onClick={() => handleSocialAuth("google")}
              disabled={loading}
              variant="outline"
              className="w-full bg-red-600 hover:bg-red-700 border-red-600 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              {isLogin ? "Mit Google anmelden" : "Mit Google registrieren"}
            </Button>

            <Button
              onClick={() => handleSocialAuth("facebook")}
              disabled={loading}
              variant="outline"
              className="w-full bg-blue-600 hover:bg-blue-700 border-blue-600 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Facebook className="w-4 h-4 mr-2" />
              )}
              {isLogin ? "Mit Facebook anmelden" : "Mit Facebook registrieren"}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-900 px-2 text-gray-400">oder</span>
            </div>
          </div>

          {/* E-Mail / Passwort */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="E-Mail Adresse"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              required
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              required
              minLength={6}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />

            {!isLogin && (
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  className="border-gray-600 data-[state=checked]:bg-orange-500"
                />
                <label htmlFor="terms" className="text-sm text-gray-300 leading-relaxed">
                  Ich akzeptiere die{" "}
                  <span className="text-orange-400 underline cursor-pointer">AGB</span> und{" "}
                  <span className="text-orange-400 underline cursor-pointer">Datenschutzerklärung</span>
                </label>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bitte warten...
                </>
              ) : isLogin ? (
                "Anmelden"
              ) : (
                "Registrieren"
              )}
            </Button>
          </form>

          {/* Toggle Login / Register */}
          <div className="text-center">
            <Button
              onClick={() => setIsLogin(!isLogin)}
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              {isLogin
                ? "Noch kein Konto? Hier registrieren"
                : "Bereits ein Konto? Hier anmelden"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
