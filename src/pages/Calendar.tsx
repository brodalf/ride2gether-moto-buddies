
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Calendar as CalendarIcon, Plus } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

const Calendar = () => {
  const [selectedFilter, setSelectedFilter] = useState("alle");

  const events = [
    {
      id: 1,
      title: "Schwarzwald Tour",
      date: "15. Juli 2024",
      time: "09:00",
      location: "Baden-Baden",
      participants: 8,
      maxParticipants: 12,
      type: "tour",
      description: "Entspannte Tagestour durch den nördlichen Schwarzwald mit Einkehr im Gasthof."
    },
    {
      id: 2,
      title: "Alpen Challenge",
      date: "22. Juli 2024",
      time: "07:00",
      location: "Garmisch-Partenkirchen",
      participants: 15,
      maxParticipants: 20,
      type: "sportlich",
      description: "Sportliche 3-Tages-Tour durch die bayerischen Alpen für erfahrene Fahrer."
    },
    {
      id: 3,
      title: "Mosel Genuss-Tour",
      date: "28. Juli 2024",
      time: "10:00",
      location: "Koblenz",
      participants: 6,
      maxParticipants: 10,
      type: "entspannt",
      description: "Gemütliche Tour entlang der Mosel mit Weinverkostung und regionalen Spezialitäten."
    },
    {
      id: 4,
      title: "Bike & BBQ",
      date: "5. August 2024",
      time: "14:00",
      location: "Heidelberg",
      participants: 12,
      maxParticipants: 25,
      type: "social",
      description: "Kurze Ausfahrt mit anschließendem Grillabend. Perfekt für Familien und Anfänger."
    }
  ];

  const filters = [
    { id: "alle", label: "Alle Events" },
    { id: "tour", label: "Touren" },
    { id: "sportlich", label: "Sportlich" },
    { id: "entspannt", label: "Entspannt" },
    { id: "social", label: "Social" }
  ];

  const filteredEvents = selectedFilter === "alle" 
    ? events 
    : events.filter(event => event.type === selectedFilter);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "tour": return "bg-blue-500";
      case "sportlich": return "bg-red-500";
      case "entspannt": return "bg-green-500";
      case "social": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Events & Touren</h1>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Event erstellen
          </Button>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="p-4">
        <div className="flex space-x-2 overflow-x-auto">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              variant={selectedFilter === filter.id ? "default" : "outline"}
              className={`whitespace-nowrap ${
                selectedFilter === filter.id
                  ? "bg-orange-500 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 px-4 pb-4 space-y-4">
        {filteredEvents.map((event) => (
          <Card key={event.id} className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-white text-lg">{event.title}</CardTitle>
                <Badge className={`${getTypeColor(event.type)} text-white`}>
                  {event.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-gray-300 text-sm">{event.description}</p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center">
                  <span>{event.time}</span>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{event.participants}/{event.maxParticipants} Teilnehmer</span>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <Button 
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Teilnehmen
                </Button>
                <Button 
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">
              Keine Events gefunden
            </h3>
            <p className="text-gray-500">
              Erstelle dein erstes Event oder ändere die Filter.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Calendar;
