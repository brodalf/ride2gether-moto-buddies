import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MapPin, Users, Calendar as CalendarIcon, Plus, Loader2, LogIn, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { supabase, Event, EventType, RidingStyle } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const EVENT_TYPE_COLORS: Record<string, string> = {
  tour:       "bg-blue-500",
  sportlich:  "bg-red-500",
  entspannt:  "bg-green-500",
  social:     "bg-purple-500",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  tour:       "Tour",
  sportlich:  "Sportlich",
  entspannt:  "Entspannt",
  social:     "Social",
};

const FILTERS = [
  { id: "alle",      label: "Alle Events" },
  { id: "tour",      label: "Touren" },
  { id: "sportlich", label: "Sportlich" },
  { id: "entspannt", label: "Entspannt" },
  { id: "social",    label: "Social" },
];

const RIDING_STYLES: { id: RidingStyle; label: string }[] = [
  { id: "entspannt", label: "Entspannt" },
  { id: "normal",    label: "Normal" },
  { id: "sportlich", label: "Sportlich" },
  { id: "alle",      label: "Alle" },
];

const defaultForm = {
  name:         "",
  description:  "",
  location_text:"",
  event_date:   "",
  event_time:   "",
  max_members:  "10",
  event_type:   "tour" as EventType,
  riding_style: "alle" as RidingStyle,
};

const Calendar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("alle");
  const [userId, setUserId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [joining, setJoining] = useState<string | null>(null); // eventId being joined/left
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUserId(session.user.id);
      await loadEvents();
    };
    init();
  }, [navigate]);

  const loadEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_events", { p_limit: 50, p_offset: 0 });
    if (error) {
      toast({ title: "Fehler beim Laden der Events", description: error.message, variant: "destructive" });
    } else {
      setEvents((data as Event[]) || []);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name fehlt", description: "Bitte gib einen Event-Namen ein.", variant: "destructive" });
      return;
    }
    const maxMem = parseInt(form.max_members);
    if (isNaN(maxMem) || maxMem < 2 || maxMem > 100) {
      toast({ title: "Ungültige Teilnehmerzahl", description: "Zwischen 2 und 100.", variant: "destructive" });
      return;
    }

    // Datum + Uhrzeit zu ISO kombinieren
    let eventDate: string | null = null;
    if (form.event_date) {
      const timeStr = form.event_time || "00:00";
      eventDate = new Date(`${form.event_date}T${timeStr}`).toISOString();
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { error } = await supabase.from("groups").insert({
        name:          form.name.trim().slice(0, 100),
        description:   form.description.trim().slice(0, 1000) || null,
        creator_id:    session.user.id,
        max_members:   maxMem,
        location_text: form.location_text.trim().slice(0, 200) || null,
        event_date:    eventDate,
        event_type:    form.event_type,
        riding_style:  form.riding_style,
      });

      if (error) throw error;

      // Ersteller automatisch als Admin-Mitglied eintragen
      const { data: newGroup } = await supabase
        .from("groups")
        .select("id")
        .eq("creator_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (newGroup) {
        await supabase.from("group_members").insert({
          group_id: newGroup.id,
          user_id:  session.user.id,
          role:     "admin",
        });
      }

      toast({ title: "Event erstellt!", description: form.name });
      setForm(defaultForm);
      setDialogOpen(false);
      await loadEvents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast({ title: "Fehler beim Erstellen", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleJoin = async (event: Event) => {
    setJoining(event.id);
    try {
      const { data: result, error } = await supabase.rpc("join_event", { p_group_id: event.id });
      if (error) throw error;

      if (!result.ok) {
        const reasons: Record<string, string> = {
          already_member: "Du nimmst bereits teil.",
          full:           "Dieses Event ist leider voll.",
        };
        toast({ title: "Beitreten nicht möglich", description: reasons[result.reason] ?? result.reason, variant: "destructive" });
      } else {
        toast({ title: "Erfolgreich angemeldet!", description: event.name });
        await loadEvents();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fehler";
      toast({ title: "Fehler", description: msg, variant: "destructive" });
    } finally {
      setJoining(null);
    }
  };

  const handleLeave = async (event: Event) => {
    setJoining(event.id);
    try {
      const { data: result, error } = await supabase.rpc("leave_event", { p_group_id: event.id });
      if (error) throw error;

      if (!result.ok && result.reason === "creator_cannot_leave") {
        toast({ title: "Du bist der Organisator", description: "Lösche das Event stattdessen.", variant: "destructive" });
      } else {
        toast({ title: "Abgemeldet", description: event.name });
        await loadEvents();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fehler";
      toast({ title: "Fehler", description: msg, variant: "destructive" });
    } finally {
      setJoining(null);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const filteredEvents =
    selectedFilter === "alle"
      ? events
      : events.filter((e) => e.event_type === selectedFilter);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Events & Touren</h1>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Neues Event
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Event erstellen</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Name */}
                <div>
                  <Label className="text-gray-300">Name *</Label>
                  <Input
                    placeholder="z.B. Schwarzwald Tagestour"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    maxLength={100}
                  />
                </div>

                {/* Beschreibung */}
                <div>
                  <Label className="text-gray-300">Beschreibung</Label>
                  <Textarea
                    placeholder="Was erwartet die Teilnehmer?"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white mt-1 h-20"
                    maxLength={1000}
                  />
                </div>

                {/* Ort */}
                <div>
                  <Label className="text-gray-300">Treffpunkt</Label>
                  <Input
                    placeholder="z.B. Parkplatz Titisee-Neustadt"
                    value={form.location_text}
                    onChange={(e) => setForm({ ...form, location_text: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    maxLength={200}
                  />
                </div>

                {/* Datum + Uhrzeit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-300">Datum</Label>
                    <Input
                      type="date"
                      value={form.event_date}
                      onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Uhrzeit</Label>
                    <Input
                      type="time"
                      value={form.event_time}
                      onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                    />
                  </div>
                </div>

                {/* Max. Teilnehmer */}
                <div>
                  <Label className="text-gray-300">Max. Teilnehmer</Label>
                  <Input
                    type="number"
                    min={2}
                    max={100}
                    value={form.max_members}
                    onChange={(e) => setForm({ ...form, max_members: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                  />
                </div>

                {/* Event-Typ */}
                <div>
                  <Label className="text-gray-300">Art des Events</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {(["tour", "sportlich", "entspannt", "social"] as EventType[]).map((t) => (
                      <Button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, event_type: t })}
                        variant={form.event_type === t ? "default" : "outline"}
                        className={
                          form.event_type === t
                            ? `${EVENT_TYPE_COLORS[t]} text-white`
                            : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                        }
                      >
                        {EVENT_TYPE_LABELS[t]}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Fahrstil */}
                <div>
                  <Label className="text-gray-300">Fahrstil</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {RIDING_STYLES.map((s) => (
                      <Button
                        key={s.id}
                        type="button"
                        onClick={() => setForm({ ...form, riding_style: s.id })}
                        variant={form.riding_style === s.id ? "default" : "outline"}
                        className={
                          form.riding_style === s.id
                            ? "bg-orange-500 text-white"
                            : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                        }
                      >
                        {s.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={saving}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-2"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wird erstellt...</>
                  ) : (
                    "Event erstellen"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter */}
      <div className="p-4 pb-0">
        <div className="flex space-x-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              variant={selectedFilter === f.id ? "default" : "outline"}
              className={`whitespace-nowrap ${
                selectedFilter === f.id
                  ? "bg-orange-500 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Event-Liste */}
      <div className="flex-1 px-4 py-4 space-y-4">
        {filteredEvents.map((event) => {
          const isCreator = event.creator_id === userId;
          const isBusy = joining === event.id;
          const isFull = event.member_count >= event.max_members;

          return (
            <Card key={event.id} className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-white text-lg leading-tight">{event.name}</CardTitle>
                  <Badge className={`${EVENT_TYPE_COLORS[event.event_type ?? "tour"] ?? "bg-gray-500"} text-white shrink-0`}>
                    {EVENT_TYPE_LABELS[event.event_type ?? "tour"] ?? event.event_type}
                  </Badge>
                </div>
                {event.creator_name && (
                  <p className="text-xs text-gray-500">von {event.creator_name}</p>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                {event.description && (
                  <p className="text-gray-300 text-sm">{event.description}</p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
                  {event.event_date && (
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                  )}
                  {event.location_text && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location_text}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Users className="w-4 h-4" />
                    <span
                      className={isFull && !event.is_member ? "text-red-400" : ""}
                    >
                      {event.member_count}/{event.max_members} Teilnehmer
                      {isFull && " · Voll"}
                    </span>
                  </div>
                  {event.riding_style && (
                    <span className="text-xs text-gray-500 capitalize">{event.riding_style}</span>
                  )}
                </div>

                {/* Aktions-Buttons */}
                <div className="flex gap-2 pt-1">
                  {event.is_member ? (
                    <Button
                      onClick={() => handleLeave(event)}
                      disabled={isBusy}
                      variant="outline"
                      className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-red-400 hover:border-red-400"
                    >
                      {isBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <><LogOut className="w-4 h-4 mr-2" />{isCreator ? "Organisator" : "Abmelden"}</>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleJoin(event)}
                      disabled={isBusy || isFull}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <><LogIn className="w-4 h-4 mr-2" />Teilnehmen</>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <CalendarIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">Keine Events gefunden</h3>
            <p className="text-gray-500 mb-6">
              {selectedFilter === "alle"
                ? "Sei der Erste und erstelle ein Event!"
                : "Keine Events in dieser Kategorie."}
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Event erstellen
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Calendar;
