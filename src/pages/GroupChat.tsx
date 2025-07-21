import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, ArrowLeft, Users, Calendar, MapPin, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";

const GroupChat = () => {
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{[key: number]: any[]}>({
    1: [
      {
        id: 1,
        sender: "Marcus",
        content: "Perfekte Bedingungen für unsere Schwarzwald-Tour morgen! 🏍️",
        timestamp: "14:30",
        isOwn: false
      },
      {
        id: 2,
        sender: "Anna",
        content: "Freue mich schon! Wie ist das Wetter?",
        timestamp: "14:32",
        isOwn: false
      },
      {
        id: 3,
        sender: "Du",
        content: "Sonne pur! Perfekt für eine entspannte Tour. 😎",
        timestamp: "14:35",
        isOwn: true
      }
    ],
    2: [
      {
        id: 1,
        sender: "Stefan",
        content: "Denkt dran: Start um 7:00 Uhr am Parkplatz!",
        timestamp: "16:20",
        isOwn: false
      }
    ]
  });

  const groupChats = [
    {
      id: 1,
      name: "Schwarzwald Tour",
      participants: 4,
      maxParticipants: 6,
      date: "15. Juli 2024",
      time: "09:00",
      location: "Baden-Baden",
      type: "entspannt",
      lastMessage: "Sonne pur! Perfekt für eine entspannte Tour. 😎",
      lastMessageTime: "14:35",
      unreadCount: 0
    },
    {
      id: 2,
      name: "Alpen Challenge",
      participants: 8,
      maxParticipants: 8,
      date: "22. Juli 2024", 
      time: "07:00",
      location: "Garmisch-Partenkirchen",
      type: "sportlich",
      lastMessage: "Denkt dran: Start um 7:00 Uhr am Parkplatz!",
      lastMessageTime: "16:20",
      unreadCount: 2
    },
    {
      id: 3,
      name: "Mosel Genuss-Tour",
      participants: 3,
      maxParticipants: 5,
      date: "28. Juli 2024",
      time: "10:00", 
      location: "Koblenz",
      type: "entspannt",
      lastMessage: "Noch Plätze frei! Wer hat Lust?",
      lastMessageTime: "12:15",
      unreadCount: 1
    }
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case "tour": return "bg-blue-500";
      case "sportlich": return "bg-red-500";
      case "entspannt": return "bg-green-500";
      case "social": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && selectedGroup) {
      const newMessage = {
        id: (messages[selectedGroup]?.length || 0) + 1,
        sender: "Du",
        content: message,
        timestamp: new Date().toLocaleTimeString('de-DE', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        isOwn: true
      };
      
      setMessages(prev => ({
        ...prev,
        [selectedGroup]: [...(prev[selectedGroup] || []), newMessage]
      }));
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  if (selectedGroup) {
    const group = groupChats.find(g => g.id === selectedGroup);
    const groupMessages = messages[selectedGroup] || [];

    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-800 p-4">
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setSelectedGroup(null)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white p-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-white">{group?.name}</h3>
              <div className="flex items-center text-xs text-gray-400">
                <Users className="w-3 h-3 mr-1" />
                <span>{group?.participants}/{group?.maxParticipants} Teilnehmer</span>
                <MapPin className="w-3 h-3 ml-3 mr-1" />
                <span>{group?.location}</span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-orange-500 hover:bg-orange-500/10"
            >
              <Calendar className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {groupMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  msg.isOwn
                    ? 'bg-orange-500 text-white rounded-br-sm'
                    : 'bg-gray-800 text-white rounded-bl-sm'
                }`}
              >
                {!msg.isOwn && (
                  <p className="text-xs font-semibold mb-1 text-orange-300">{msg.sender}</p>
                )}
                <p className="text-sm">{msg.content}</p>
                <div className={`text-xs mt-1 ${
                  msg.isOwn ? 'text-orange-100' : 'text-gray-400'
                }`}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-2">
          <div className="flex space-x-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 text-xs"
            >
              📍 Treffpunkt teilen
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 text-xs"
            >
              🗺️ Route zeigen
            </Button>
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-gray-900 border-t border-gray-800 p-4">
          <div className="flex space-x-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nachricht an die Gruppe..."
              className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            />
            <Button
              onClick={handleSendMessage}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4"
            >
              <Send className="w-4 h-4" />
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
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Gruppenchats</h1>
          <Button
            onClick={() => navigate("/calendar")}
            variant="ghost"
            size="sm"
            className="text-orange-500 hover:bg-orange-500/10"
          >
            <Calendar className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Chats basierend auf deinen Tour-Anmeldungen
        </p>
      </div>

      {/* Group Chats List */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {groupChats.map((group) => (
          <Card 
            key={group.id} 
            className="bg-gray-900 border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors"
            onClick={() => setSelectedGroup(group.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-white truncate">{group.name}</h3>
                    <div className="flex items-center space-x-2">
                      {group.unreadCount > 0 && (
                        <Badge className="bg-orange-500 text-white text-xs px-2 py-1">
                          {group.unreadCount}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-400">{group.lastMessageTime}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge className={`${getTypeColor(group.type)} text-white text-xs`}>
                      {group.type}
                    </Badge>
                    <div className="flex items-center text-xs text-gray-400">
                      <Users className="w-3 h-3 mr-1" />
                      <span>{group.participants}/{group.maxParticipants}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-400">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>{group.date}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-300 truncate">{group.lastMessage}</p>
                </div>
                
                <MessageCircle className="w-5 h-5 text-gray-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}

        {groupChats.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">
              Keine Gruppenchats
            </h3>
            <p className="text-gray-500 mb-4">
              Melde dich für Events an, um automatisch zu den Gruppenchats hinzugefügt zu werden.
            </p>
            <Button 
              onClick={() => navigate("/calendar")}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Events ansehen
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default GroupChat;