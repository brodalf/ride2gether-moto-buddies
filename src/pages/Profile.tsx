import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Settings, Edit, Bike, MapPin, Heart, MessageCircle, Loader2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { supabase, Profile as ProfileType, RidingStyle } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const RIDING_STYLE_LABELS: Record<string, string> = {
  entspannt: "Entspannt",
  normal:    "Normal",
  sportlich: "Sportlich",
  alle:      "Alle",
};

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [stats, setStats] = useState({ matches: 0, chats: 0, messages: 0 });
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name:       "",
    age:             "",
    bio:             "",
    motorcycle_brand:"",
    motorcycle_model:"",
    riding_style:    "alle" as RidingStyle,
    max_distance_km: [50],
  });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUserId(session.user.id);
      await Promise.all([loadProfile(session.user.id), loadStats(session.user.id)]);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();

    if (error) {
      toast({ title: "Profil konnte nicht geladen werden", variant: "destructive" });
      return;
    }
    setProfile(data);
    setForm({
      full_name:        data.full_name        ?? "",
      age:              data.age?.toString()  ?? "",
      bio:              data.bio              ?? "",
      motorcycle_brand: data.motorcycle_brand ?? "",
      motorcycle_model: data.motorcycle_model ?? "",
      riding_style:     (data.riding_style as RidingStyle) ?? "alle",
      max_distance_km:  [data.max_distance_km ?? 50],
    });
  };

  const loadStats = async (uid: string) => {
    const { data } = await supabase.rpc("get_user_stats", { p_user_id: uid });
    if (data) setStats(data);
  };

  const handleSave = async () => {
    if (!userId) return;
    const parsedAge = form.age ? parseInt(form.age) : null;
    if (parsedAge !== null && (parsedAge < 18 || parsedAge > 99)) {
      toast({ title: "Alter muss zwischen 18 und 99 liegen.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name:        form.full_name.trim()        || null,
      age:              parsedAge,
      bio:              form.bio.trim().slice(0, 500) || null,
      motorcycle_brand: form.motorcycle_brand.trim().slice(0, 100) || null,
      motorcycle_model: form.motorcycle_model.trim().slice(0, 100) || null,
      riding_style:     form.riding_style,
      max_distance_km:  form.max_distance_km[0],
    }).eq("id", userId);

    if (error) {
      toast({ title: "Fehler beim Speichern", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profil gespeichert!" });
      setEditOpen(false);
      await loadProfile(userId);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    const { error } = await supabase.rpc("delete_own_account");
    if (error) {
      toast({ title: "Fehler beim Löschen", description: error.message, variant: "destructive" });
    } else {
      await supabase.auth.signOut();
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const displayName = profile?.full_name || "Anonym";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Mein Profil</h1>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 pb-24">
        {/* Profil-Card */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-500 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-2xl font-bold">{initials}</span>
              )}
            </div>
            <CardTitle className="text-white text-xl">
              {displayName}{profile?.age ? `, ${profile.age}` : ""}
            </CardTitle>
            {(profile?.motorcycle_brand || profile?.motorcycle_model) && (
              <div className="flex items-center justify-center text-orange-400 mt-2">
                <Bike className="w-4 h-4 mr-2" />
                <span className="text-sm">
                  {[profile?.motorcycle_brand, profile?.motorcycle_model].filter(Boolean).join(" ")}
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.bio && (
              <p className="text-gray-300 text-sm text-center leading-relaxed">{profile.bio}</p>
            )}

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-orange-500 font-semibold">
                  {profile?.riding_style ? RIDING_STYLE_LABELS[profile.riding_style] ?? profile.riding_style : "–"}
                </div>
                <div className="text-xs text-gray-400">Fahrstil</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-orange-500 font-semibold">
                  {profile?.max_distance_km ?? 50} km
                </div>
                <div className="text-xs text-gray-400">Max. Distanz</div>
              </div>
            </div>

            <Button
              onClick={() => setEditOpen(true)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              Profil bearbeiten
            </Button>
          </CardContent>
        </Card>

        {/* Statistiken */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Deine Statistiken</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Heart className="w-6 h-6 text-green-500" />
                </div>
                <div className="text-xl font-bold text-white">{stats.matches}</div>
                <div className="text-xs text-gray-400">Matches</div>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                  <MessageCircle className="w-6 h-6 text-blue-500" />
                </div>
                <div className="text-xl font-bold text-white">{stats.chats}</div>
                <div className="text-xs text-gray-400">Chats</div>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto">
                  <MapPin className="w-6 h-6 text-orange-500" />
                </div>
                <div className="text-xl font-bold text-white">{stats.messages}</div>
                <div className="text-xs text-gray-400">Nachrichten</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Einstellungen */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Einstellungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800">
              <Settings className="w-4 h-4 mr-3" />
              Benachrichtigungen
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800">
              Privatsphäre
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800">
              Impressum
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800">
              Datenschutzerklärung
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800">
              AGB
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20">
                  Konto löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-900 border-gray-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Konto wirklich löschen?</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    Alle deine Daten, Matches und Nachrichten werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                    Abbrechen
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Konto löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      {/* Profil bearbeiten Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Profil bearbeiten</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-gray-300">Name</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white mt-1"
                placeholder="Dein Name"
                maxLength={100}
              />
            </div>

            <div>
              <Label className="text-gray-300">Alter</Label>
              <Input
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white mt-1"
                min={18}
                max={99}
              />
            </div>

            <div>
              <Label className="text-gray-300">Über mich</Label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white mt-1 h-20"
                placeholder="Erzähle etwas über dich..."
                maxLength={500}
              />
              <p className="text-xs text-gray-500 text-right mt-1">{form.bio.length}/500</p>
            </div>

            <div>
              <Label className="text-gray-300">Motorrad Hersteller</Label>
              <Input
                value={form.motorcycle_brand}
                onChange={(e) => setForm({ ...form, motorcycle_brand: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white mt-1"
                placeholder="z.B. BMW, Honda, Ducati..."
              />
            </div>

            <div>
              <Label className="text-gray-300">Motorrad Modell</Label>
              <Input
                value={form.motorcycle_model}
                onChange={(e) => setForm({ ...form, motorcycle_model: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white mt-1"
                placeholder="z.B. R1250GS, CBR600RR..."
              />
            </div>

            <div>
              <Label className="text-gray-300">Fahrstil</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(["entspannt", "normal", "sportlich", "alle"] as RidingStyle[]).map((s) => (
                  <Button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, riding_style: s })}
                    variant={form.riding_style === s ? "default" : "outline"}
                    className={
                      form.riding_style === s
                        ? "bg-orange-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                    }
                  >
                    {RIDING_STYLE_LABELS[s]}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-gray-300">
                Max. Distanz zum Treffpunkt: {form.max_distance_km[0]} km
              </Label>
              <Slider
                value={form.max_distance_km}
                onValueChange={(v) => setForm({ ...form, max_distance_km: v })}
                min={10}
                max={200}
                step={10}
                className="mt-3"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10 km</span>
                <span>200 km</span>
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wird gespeichert...</>
              ) : (
                "Speichern"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Profile;
