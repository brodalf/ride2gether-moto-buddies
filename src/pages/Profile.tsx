
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Edit, Bike, MapPin, Heart, MessageCircle } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

const Profile = () => {
  const userProfile = {
    name: "Du",
    age: 29,
    description: "Leidenschaftlicher Biker mit Vorliebe für kurvige Bergstraßen. Suche nette Leute für entspannte Touren und neue Abenteuer.",
    bike: "Yamaha MT-09",
    bikeBrand: "Yamaha",
    ridingStyle: "Normal",
    maxDistance: 75,
    totalMatches: 24,
    totalChats: 8,
    totalTours: 12
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Mein Profil</h1>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Profile Card */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {userProfile.name.charAt(0)}
              </span>
            </div>
            <CardTitle className="text-white text-xl">
              {userProfile.name}, {userProfile.age}
            </CardTitle>
            <div className="flex items-center justify-center text-orange-400 mt-2">
              <Bike className="w-4 h-4 mr-2" />
              <span className="text-sm">{userProfile.bike}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300 text-sm text-center leading-relaxed">
              {userProfile.description}
            </p>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-orange-500 font-semibold">{userProfile.ridingStyle}</div>
                <div className="text-xs text-gray-400">Fahrstil</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-orange-500 font-semibold">{userProfile.maxDistance} km</div>
                <div className="text-xs text-gray-400">Max. Distanz</div>
              </div>
            </div>

            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              <Edit className="w-4 h-4 mr-2" />
              Profil bearbeiten
            </Button>
          </CardContent>
        </Card>

        {/* Stats Card */}
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
                <div className="text-xl font-bold text-white">{userProfile.totalMatches}</div>
                <div className="text-xs text-gray-400">Matches</div>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                  <MessageCircle className="w-6 h-6 text-blue-500" />
                </div>
                <div className="text-xl font-bold text-white">{userProfile.totalChats}</div>
                <div className="text-xs text-gray-400">Chats</div>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto">
                  <MapPin className="w-6 h-6 text-orange-500" />
                </div>
                <div className="text-xl font-bold text-white">{userProfile.totalTours}</div>
                <div className="text-xs text-gray-400">Touren</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Einstellungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800">
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
            <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20">
              Konto löschen
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
