import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { supabase, Message, UserMatch } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const Chat = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const rawMatchIdParam = searchParams.get("matchId");
  // UUID-Format validieren – verhindert fehlerhafte DB-Queries mit unbekannten Werten
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const matchIdParam = rawMatchIdParam && UUID_REGEX.test(rawMatchIdParam) ? rawMatchIdParam : null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMatch, setCurrentMatch] = useState<UserMatch | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const uid = session.user.id;
      setUserId(uid);

      // Match laden (aus URL-Param oder ersten verfügbaren Match)
      const targetMatchId = matchIdParam || (await getFirstMatchId(uid));
      if (!targetMatchId) {
        setLoading(false);
        return;
      }

      await loadMatch(targetMatchId, uid);
      await loadMessages(targetMatchId);
      subscribeToMessages(targetMatchId);

      // Nachrichten als gelesen markieren
      await supabase.rpc("mark_messages_read", {
        p_match_id: targetMatchId,
        p_user_id: uid,
      });

      setLoading(false);
    };

    init();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [matchIdParam, navigate]); // navigate als Dependency verhindert stale closure

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getFirstMatchId = async (uid: string): Promise<string | null> => {
    const { data } = await supabase.rpc("get_user_matches", { p_user_id: uid });
    return (data as UserMatch[] | null)?.[0]?.match_id ?? null;
  };

  const loadMatch = async (mId: string, uid: string) => {
    const { data } = await supabase.rpc("get_user_matches", { p_user_id: uid });
    const match = (data as UserMatch[] | null)?.find((m) => m.match_id === mId);
    setCurrentMatch(match ?? null);
  };

  const loadMessages = async (mId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("match_id", mId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({ title: "Fehler beim Laden der Nachrichten", variant: "destructive" });
    } else {
      setMessages(data || []);
    }
  };

  const subscribeToMessages = (mId: string) => {
    // Alten Kanal zuerst sauber entfernen (verhindert mehrfache Subscriptions)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`messages:${mId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${mId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe((status, err) => {
        if (err || status === "CHANNEL_ERROR") {
          console.error("Realtime-Subscription fehlgeschlagen:", status, err);
        }
      });

    channelRef.current = channel;
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !userId || !currentMatch) return;
    const content = message.trim();
    if (content.length > 2000) {
      toast({ title: "Nachricht zu lang", description: "Maximal 2000 Zeichen erlaubt.", variant: "destructive" });
      return;
    }
    setMessage("");

    const { error } = await supabase.from("messages").insert({
      match_id: currentMatch.match_id,
      sender_id: userId,
      content,
    });

    if (error) {
      toast({ title: "Fehler beim Senden", description: error.message, variant: "destructive" });
      setMessage(content); // Eingabe wiederherstellen
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!currentMatch) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <h2 className="text-2xl font-bold mb-4">Noch keine Matches</h2>
            <p className="text-gray-400 mb-6">Swipe weiter um Tourenpartner zu finden!</p>
            <Button
              onClick={() => navigate("/matching")}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Zum Matching
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
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center overflow-hidden shrink-0">
            {currentMatch.partner_avatar ? (
              <img
                src={currentMatch.partner_avatar}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-semibold text-sm">
                {currentMatch.partner_name?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">
              {currentMatch.partner_name || "Unbekannt"}
            </h3>
          </div>

          <Button variant="ghost" size="sm" className="text-orange-500 hover:bg-orange-500/10">
            <Calendar className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Nachrichtenbereich */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-8">
            Schreib die erste Nachricht!
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === userId;
          return (
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  isOwn
                    ? "bg-orange-500 text-white rounded-br-sm"
                    : "bg-gray-800 text-white rounded-bl-sm"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <div
                  className={`text-xs mt-1 ${isOwn ? "text-orange-100" : "text-gray-400"}`}
                >
                  {formatTime(msg.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2">
        <div className="flex space-x-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 text-xs"
          >
            Treffpunkt vorschlagen
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 text-xs"
          >
            Termin planen
          </Button>
        </div>
      </div>

      {/* Eingabefeld */}
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nachricht schreiben..."
            className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
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
