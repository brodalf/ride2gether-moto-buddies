import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload, User, Bike, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase, uploadPhoto } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bikeInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState({
    age: "",
    description: "",
    bikeType: "",
    bikeBrand: "",
    ridingStyle: "",
    maxDistance: [50],
    avatarFile: null as File | null,
    bikeFile: null as File | null,
    avatarPreview: "",
    bikePreview: "",
  });

  const ridingStyles = [
    { id: "entspannt", label: "Entspannt", color: "bg-green-500" },
    { id: "normal",    label: "Normal",    color: "bg-blue-500"  },
    { id: "sportlich", label: "Sportlich", color: "bg-red-500"   },
    { id: "alle",      label: "Alle",      color: "bg-orange-500"},
  ];

  const handleFileChange = (type: "avatar" | "bike", file: File | null) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    if (type === "avatar") {
      setProfileData((d) => ({ ...d, avatarFile: file, avatarPreview: preview }));
    } else {
      setProfileData((d) => ({ ...d, bikeFile: file, bikePreview: preview }));
    }
  };

  const steps = [
    {
      title: "Persönliche Daten",
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="age" className="text-white">Alter</Label>
            <Input
              id="age"
              type="number"
              placeholder="Dein Alter"
              value={profileData.age}
              onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white"
              min={18}
              max={99}
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-white">Selbstbeschreibung</Label>
            <Textarea
              id="description"
              placeholder="Erzähle etwas über dich..."
              value={profileData.description}
              onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white h-24"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Dein Motorrad",
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="bikeBrand" className="text-white">Hersteller</Label>
            <Input
              id="bikeBrand"
              placeholder="z.B. BMW, Honda, Ducati..."
              value={profileData.bikeBrand}
              onChange={(e) => setProfileData({ ...profileData, bikeBrand: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div>
            <Label htmlFor="bikeType" className="text-white">Modell/Typ</Label>
            <Input
              id="bikeType"
              placeholder="z.B. R1250GS, CBR600RR..."
              value={profileData.bikeType}
              onChange={(e) => setProfileData({ ...profileData, bikeType: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Fahrstil",
      content: (
        <div className="space-y-4">
          <Label className="text-white">Wähle deinen Fahrstil:</Label>
          <div className="grid grid-cols-2 gap-3">
            {ridingStyles.map((style) => (
              <Button
                key={style.id}
                onClick={() => setProfileData({ ...profileData, ridingStyle: style.id })}
                variant={profileData.ridingStyle === style.id ? "default" : "outline"}
                className={
                  profileData.ridingStyle === style.id
                    ? `${style.color} text-white`
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                }
              >
                {style.label}
              </Button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Reisebereitschaft",
      content: (
        <div className="space-y-6">
          <div>
            <Label className="text-white">
              Maximale Distanz zum Treffpunkt: {profileData.maxDistance[0]} km
            </Label>
            <div className="mt-4">
              <Slider
                value={profileData.maxDistance}
                onValueChange={(value) => setProfileData({ ...profileData, maxDistance: value })}
                max={200}
                min={10}
                step={10}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>10 km</span>
              <span>200 km</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Fotos hinzufügen",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Profilfoto */}
            <div
              className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-orange-500 transition-colors cursor-pointer overflow-hidden relative"
              onClick={() => avatarInputRef.current?.click()}
            >
              {profileData.avatarPreview ? (
                <img
                  src={profileData.avatarPreview}
                  alt="Profilfoto"
                  className="w-full h-full object-cover absolute inset-0 rounded-lg"
                />
              ) : (
                <>
                  <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Dein Foto</p>
                  <Upload className="w-4 h-4 text-gray-500 mx-auto mt-1" />
                </>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange("avatar", e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Motorradfoto */}
            <div
              className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-orange-500 transition-colors cursor-pointer overflow-hidden relative"
              onClick={() => bikeInputRef.current?.click()}
            >
              {profileData.bikePreview ? (
                <img
                  src={profileData.bikePreview}
                  alt="Motorradfoto"
                  className="w-full h-full object-cover absolute inset-0 rounded-lg"
                />
              ) : (
                <>
                  <Bike className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Dein Motorrad</p>
                  <Upload className="w-4 h-4 text-gray-500 mx-auto mt-1" />
                </>
              )}
              <input
                ref={bikeInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange("bike", e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center">Tippe zum Hinzufügen von Fotos</p>
        </div>
      ),
    },
  ];

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    // Letzter Schritt: Profil in Supabase speichern
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const userId = session.user.id;

      // Fotos hochladen
      let avatarUrl: string | null = null;
      let bikeUrl: string | null = null;
      if (profileData.avatarFile) {
        avatarUrl = await uploadPhoto(userId, profileData.avatarFile, "avatar");
      }
      if (profileData.bikeFile) {
        bikeUrl = await uploadPhoto(userId, profileData.bikeFile, "bike");
      }

      // Profil speichern
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        age: profileData.age ? parseInt(profileData.age) : null,
        bio: profileData.description || null,
        motorcycle_brand: profileData.bikeBrand || null,
        motorcycle_model: profileData.bikeType || null,
        riding_style: profileData.ridingStyle || null,
        max_distance_km: profileData.maxDistance[0],
        ...(avatarUrl && { avatar_url: avatarUrl }),
        ...(bikeUrl && { bike_photo_url: bikeUrl }),
      });

      if (error) throw error;

      // Standort via Geolocation API setzen (optional)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await supabase.rpc("update_user_location", {
            p_user_id: userId,
            p_lat: pos.coords.latitude,
            p_lng: pos.coords.longitude,
          });
        });
      }

      navigate("/matching");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast({ title: "Fehler beim Speichern", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-orange-500 mb-2">Profil erstellen</h1>
          <p className="text-gray-400">
            Schritt {currentStep + 1} von {steps.length}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white text-center">
              {steps[currentStep].title}
            </CardTitle>
          </CardHeader>
          <CardContent>{steps[currentStep].content}</CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex space-x-3">
          {currentStep > 0 && (
            <Button
              onClick={handlePrevious}
              disabled={saving}
              variant="outline"
              className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Zurück
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={saving}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Wird gespeichert...
              </>
            ) : currentStep < steps.length - 1 ? (
              "Weiter"
            ) : (
              "Profil erstellen"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
