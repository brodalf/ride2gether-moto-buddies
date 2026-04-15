import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, X, MapPin, Bike, Loader2, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { supabase, PotentialMatch } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const Matching = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<PotentialMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [noLocation, setNoLocation] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      await loadMatches(session.user.id);
    };
    init();
  }, [navigate]);

  const loadMatches = async (uid: string) => {
    setLoading(true);
    setNoLocation(false);

    // Standort prüfen – ohne Standort läuft das Matching gar nicht
    const { data: locationData } = await supabase
      .from("user_locations")
      .select("user_id")
      .eq("user_id", uid)
      .maybeSingle();

    if (!locationData) {
      setNoLocation(true);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("get_potential_matches", {
      p_user_id: uid,
      p_limit: 20,
    });
    if (error) {
      toast({
        title: "Fehler beim Laden",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProfiles(data || []);
      setCurrentIndex(0);
    }
    setLoading(false);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation wird nicht unterstützt", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!userId) return;
        await supabase.rpc("update_user_location", {
          p_user_id: userId,
          p_lat: pos.coords.latitude,
          p_lng: pos.coords.longitude,
        });
        await loadMatches(userId);
      },
      () => {
        toast({
          title: "Standort nicht verfügbar",
          description: "Bitte erlaube den Standortzugriff in deinen Browser-Einstellungen.",
          variant: "destructive",
        });
      }
    );
  };

  const handleSwipe = async (direction: "like" | "pass") => {
    if (!userId || !profiles[currentIndex] || isAnimating) return;
    setIsAnimating(true);

    try {
      const { data: result, error } = await supabase.rpc("process_swipe", {
        p_swiper_id: userId,
        p_swiped_id: profiles[currentIndex].id,
        p_direction: direction,
      });
      if (error) throw error;

      if (direction === "like" && result?.match) {
        toast({
          title: "Es ist ein Match!",
          description: `Du und ${profiles[currentIndex].full_name} habt euch gegenseitig gemocht.`,
        });
      }
    } catch (err: unknown) {
      console.error("Swipe-Fehler:", err);
    }

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setIsAnimating(false);
    }, 300);
  };

  const currentProfile = profiles[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Kein Standort → erklärender Hinweis statt stiller Leere
  if (noLocation) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <Navigation className="w-14 h-14 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Standort erforderlich</h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Das Matching berechnet die Distanz zu anderen Bikern. Erlaube den
              Standortzugriff, damit wir passende Tourenpartner in deiner Nähe finden können.
            </p>
            <Button onClick={requestLocation} className="w-full bg-orange-500 hover:bg-orange-600">
              Standort freigeben
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <h2 className="text-2xl font-bold mb-4">Keine weiteren Profile</h2>
            <p className="text-gray-400 mb-6">
              Im Moment gibt es niemanden in deiner Nähe mit passendem Fahrstil. Schau später
              noch einmal vorbei!
            </p>
            <Button
              onClick={() => userId && loadMatches(userId)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Neu laden
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <div className="text-xl font-bold text-orange-500">
          ride<span className="text-white">2</span>gether
        </div>
        <div className="text-gray-400">
          {currentIndex + 1} / {profiles.length}
        </div>
      </div>

      {/* Main Card */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card
          className={`bg-gray-900 border-gray-800 max-w-sm w-full transition-all duration-300 ${
            isAnimating ? "scale-95 opacity-50" : "scale-100 opacity-100"
          }`}
        >
          <CardContent className="p-0">
            {/* Foto / Platzhalter */}
            <div className="relative h-64 bg-gradient-to-br from-orange-500/20 to-gray-800 rounded-t-lg flex items-center justify-center overflow-hidden">
              {currentProfile.avatar_url ? (
                <img
                  src={currentProfile.avatar_url}
                  alt={currentProfile.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Bike className="w-20 h-20 text-orange-500/50" />
              )}
              <div className="absolute top-4 right-4 bg-black/70 px-3 py-1 rounded-full text-sm">
                {currentProfile.riding_style}
              </div>
            </div>

            {/* Profil-Info */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold text-white">
                  {currentProfile.full_name}, {currentProfile.age}
                </h2>
                <div className="flex items-center text-gray-400">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="text-sm">{Math.round(currentProfile.distance_km)} km</span>
                </div>
              </div>

              <div className="flex items-center mb-4 text-orange-400">
                <Bike className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">
                  {currentProfile.motorcycle_brand} {currentProfile.motorcycle_model}
                </span>
              </div>

              <p className="text-gray-300 text-sm leading-relaxed mb-6">{currentProfile.bio}</p>

              {/* Swipe-Buttons */}
              <div className="flex space-x-4">
                <Button
                  onClick={() => handleSwipe("pass")}
                  disabled={isAnimating}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full h-14"
                >
                  <X className="w-6 h-6" />
                </Button>
                <Button
                  onClick={() => handleSwipe("like")}
                  disabled={isAnimating}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-full h-14"
                >
                  <Heart className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center text-gray-500 text-sm pb-4">
        Swipe nach links für Nein, nach rechts für Ja
      </div>

      <BottomNav />
    </div>
  );
};

export default Matching;
