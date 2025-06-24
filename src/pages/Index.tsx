
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Users, MapPin, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const welcomeSteps = [
    {
      title: "Willkommen bei ride2gether",
      subtitle: "Die App für fehlende Tourenpartner in der Motorradcommunity!",
      description: "Finde andere Motorradfahrer in deiner Nähe und plant gemeinsame Touren.",
      icon: <Heart className="w-16 h-16 text-orange-500" />
    },
    {
      title: "Finde deinen Tourenpartner",
      subtitle: "Swipe durch Profile von Bikern",
      description: "Entdecke andere Motorradfahrer mit ähnlichen Interessen und Fahrstilen.",
      icon: <Users className="w-16 h-16 text-orange-500" />
    },
    {
      title: "Plane gemeinsame Touren",
      subtitle: "Organisiert Events und Ausfahrten",
      description: "Nutze unseren Kalender um Touren zu planen und an Events teilzunehmen.",
      icon: <Calendar className="w-16 h-16 text-orange-500" />
    }
  ];

  const handleNext = () => {
    if (currentStep < welcomeSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate("/auth");
    }
  };

  const handleSkip = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header with Logo */}
      <div className="flex justify-center py-8">
        <div className="text-2xl font-bold text-orange-500">
          ride<span className="text-white">2</span>gether
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <Card className="bg-gray-900 border-gray-800 max-w-md w-full">
          <CardContent className="p-8 text-center">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              {welcomeSteps[currentStep].icon}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white mb-3">
              {welcomeSteps[currentStep].title}
            </h1>

            {/* Subtitle */}
            <h2 className="text-lg text-orange-400 mb-4">
              {welcomeSteps[currentStep].subtitle}
            </h2>

            {/* Description */}
            <p className="text-gray-300 mb-8 leading-relaxed">
              {welcomeSteps[currentStep].description}
            </p>

            {/* Progress Dots */}
            <div className="flex justify-center space-x-2 mb-8">
              {welcomeSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentStep ? "bg-orange-500" : "bg-gray-600"
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handleNext}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3"
              >
                {currentStep < welcomeSteps.length - 1 ? "Weiter" : "Loslegen"}
              </Button>
              
              {currentStep < welcomeSteps.length - 1 && (
                <Button 
                  onClick={handleSkip}
                  variant="ghost"
                  className="w-full text-gray-400 hover:text-white"
                >
                  Überspringen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm pb-6">
        Verbinde dich mit der Motorrad-Community
      </div>
    </div>
  );
};

export default Index;
