
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Send, ArrowLeft, MapPin, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";

const Chat = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "Marcus",
      content: "Hey! Schön, dass wir ein Match haben! 😊",
      timestamp: "14:30",
      isOwn: false
    },
    {
      id: 2,
      sender: "Du",
      content: "Hi Marcus! Freut mich auch! Hast du Lust auf eine gemeinsame Tour am Wochenende?",
      timestamp: "14:32",
      isOwn: true
    },
    {
      id: 3,
      sender: "Marcus",
      content: "Das klingt super! Ich kenne eine tolle Route durch den Schwarzwald. Was hältst du davon?",
      timestamp: "14:35",
      isOwn: false
    },
    {
      id: 4,
      sender: "Du",
      content: "Perfekt! Ich liebe Schwarzwald-Touren. Wann sollen wir starten?",
      timestamp: "14:37",
      isOwn: true
    }
  ]);

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: messages.length + 1,
        sender: "Du",
        content: message,
        timestamp: new Date().toLocaleTimeString('de-DE', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        isOwn: true
      };
      setMessages([...messages, newMessage]);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => navigate("/matching")}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">M</span>
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-white">Marcus</h3>
            <div className="flex items-center text-xs text-gray-400">
              <MapPin className="w-3 h-3 mr-1" />
              <span>25 km entfernt</span>
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
        {messages.map((msg) => (
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
            📍 Treffpunkt vorschlagen
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 text-xs"
          >
            📅 Termin planen
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
            placeholder="Nachricht schreiben..."
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
};

export default Chat;
