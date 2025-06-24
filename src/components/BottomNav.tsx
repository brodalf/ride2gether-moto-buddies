
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Calendar, User, Home } from "lucide-react";

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: "home", icon: Home, label: "Home", path: "/" },
    { id: "matching", icon: Heart, label: "Matching", path: "/matching" },
    { id: "chat", icon: MessageCircle, label: "Chats", path: "/chat" },
    { id: "calendar", icon: Calendar, label: "Events", path: "/calendar" },
    { id: "profile", icon: User, label: "Profil", path: "/profile" }
  ];

  return (
    <div className="bg-gray-900 border-t border-gray-800 px-4 py-2">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Button
              key={item.id}
              onClick={() => navigate(item.path)}
              variant="ghost"
              className={`flex flex-col items-center space-y-1 p-2 ${
                isActive 
                  ? "text-orange-500" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
