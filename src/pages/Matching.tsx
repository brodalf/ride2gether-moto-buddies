
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, X, MapPin, Clock, Bike, Users } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";

const Matching = () => {
  const navigate = useNavigate();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [groupSize, setGroupSize] = useState<number[]>([1, 8]);

  // Beispiel-Daten für andere Benutzer
  const profiles = [
    {
      id: 1,
      name: "Marcus",
      age: 34,
      description: "Suche entspannte Tourenpartner für Wochenendausflüge. Fahre seit 15 Jahren und liebe die Alpenstraßen.",
      bike: "BMW R1250GS",
      style: "Entspannt",
      distance: "25 km entfernt",
      image: "/placeholder.svg"
    },
    {
      id: 2,
      name: "Sarah",
      age: 28,
      description: "Sportliche Fahrerin mit Leidenschaft für kurvige Strecken. Suche gleichgesinnte für aufregende Touren.",
      bike: "Yamaha R6",
      style: "Sportlich",
      distance: "15 km entfernt",
      image: "/placeholder.svg"
    },
    {
      id: 3,
      name: "Thomas",
      age: 42,
      description: "Erfahrener Biker der gerne neue Routen entdeckt. Freue mich auf gemeinsame Abenteuer und gute Gespräche.",
      bike: "Harley Davidson",
      style: "Normal",
      distance: "30 km entfernt",
      image: "/placeholder.svg"
    }
  ];

  const currentProfile = profiles[currentCardIndex];

  const handleSwipe = (direction: 'like' | 'pass') => {
    setIsAnimating(true);
    
    setTimeout(() => {
      if (direction === 'like') {
        console.log(`Liked ${currentProfile.name}`);
        // Hier würde ein Match überprüft werden
      }
      
      if (currentCardIndex < profiles.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
      } else {
        setCurrentCardIndex(0); // Reset für Demo
      }
      setIsAnimating(false);
    }, 300);
  };

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Keine weiteren Profile</h2>
          <p className="text-gray-400">Schau später noch einmal vorbei!</p>
        </div>
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
          {currentCardIndex + 1} / {profiles.length}
        </div>
      </div>

      {/* Group Size Filter */}
      <div className="px-6 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-gray-300">Gruppengröße</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 w-16">Min: {groupSize[0]}</span>
          <Slider
            min={1}
            max={8}
            step={1}
            value={groupSize}
            onValueChange={setGroupSize}
            className="flex-1"
          />
          <span className="text-xs text-gray-400 w-16 text-right">Max: {groupSize[1]}</span>
        </div>
      </div>

      {/* Main Card Area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card 
          className={`bg-gray-900 border-gray-800 max-w-sm w-full transition-all duration-300 ${
            isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'
          }`}
        >
          <CardContent className="p-0">
            {/* Profile Image */}
            <div className="relative h-64 bg-gradient-to-br from-orange-500/20 to-gray-800 rounded-t-lg flex items-center justify-center">
              <Bike className="w-20 h-20 text-orange-500/50" />
              <div className="absolute top-4 right-4 bg-black/70 px-3 py-1 rounded-full text-sm">
                {currentProfile.style}
              </div>
            </div>

            {/* Profile Info */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold text-white">
                  {currentProfile.name}, {currentProfile.age}
                </h2>
                <div className="flex items-center text-gray-400">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="text-sm">{currentProfile.distance}</span>
                </div>
              </div>

              <div className="flex items-center mb-4 text-orange-400">
                <Bike className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">{currentProfile.bike}</span>
              </div>

              <p className="text-gray-300 text-sm leading-relaxed mb-6">
                {currentProfile.description}
              </p>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <Button
                  onClick={() => handleSwipe('pass')}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full h-14"
                >
                  <X className="w-6 h-6" />
                </Button>
                <Button
                  onClick={() => handleSwipe('like')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-full h-14"
                >
                  <Heart className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Swipe Instructions */}
      <div className="text-center text-gray-500 text-sm pb-4">
        Swipe nach links für Nein, nach rechts für Ja
      </div>

      <BottomNav />
    </div>
  );
};

export default Matching;
