
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Facebook, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !acceptTerms) {
      alert("Bitte akzeptiere die AGB und Datenschutzerklärung");
      return;
    }
    // Hier würde normalerweise die Authentifizierung stattfinden
    navigate("/profile-setup");
  };

  const handleSocialAuth = (provider: string) => {
    console.log(`Anmeldung mit ${provider}`);
    // Hier würde die Social Media Authentifizierung implementiert
    navigate("/profile-setup");
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
          {/* Social Login Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => handleSocialAuth("Google")}
              variant="outline"
              className="w-full bg-red-600 hover:bg-red-700 border-red-600 text-white"
            >
              <Mail className="w-4 h-4 mr-2" />
              {isLogin ? "Mit Google anmelden" : "Mit Google registrieren"}
            </Button>

            <Button
              onClick={() => handleSocialAuth("Facebook")}
              variant="outline"
              className="w-full bg-blue-600 hover:bg-blue-700 border-blue-600 text-white"
            >
              <Facebook className="w-4 h-4 mr-2" />
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

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="E-Mail Adresse"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                required
              />
            </div>

            <div>
              <Input
                type="password"
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                required
              />
            </div>

            {/* Terms and Conditions for Registration */}
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
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            >
              {isLogin ? "Anmelden" : "Registrieren"}
            </Button>
          </form>

          {/* Toggle between Login/Register */}
          <div className="text-center">
            <Button
              onClick={() => setIsLogin(!isLogin)}
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              {isLogin 
                ? "Noch kein Konto? Hier registrieren" 
                : "Bereits ein Konto? Hier anmelden"
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
