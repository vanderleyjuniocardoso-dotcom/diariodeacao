import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Check, Loader2 } from "lucide-react";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

interface Slot { id: string; month: number; slot_date: string; slot_time: string; capacity: number; }
interface Booking {
  id: string; slot_id: string; volunteer_name: string; volunteer_phone: string | null; attended: boolean;
  registration_id: string | null;
}

const AdminWelcomeMeetings = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState<Record<number, { date: string; time: string }>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: b }] = await Promise.all([
      supabase.from("welcome_meeting_slots").select("*").order("slot_date"),
      supabase.from("welcome_meeting_bookings").select("*").order("created_at"),
    ]);
    setSlots((s as Slot[]) || []);
    setBookings((b as Booking[]) || []);
    setLoading(false);
  };


  useEffect(() => { load(); }, []);

  const addSlot = async (month: number) => {
    const v = newDate[month];
    if (!v?.date || !v?.time) { toast.error("Preencha data e horário"); return; }
    const { error } = await supabase.from("welcome_meeting_slots").insert({ month, slot_date: v.date, slot_time: v.time, capacity: 50 });
    if (error) { toast.error(error.message); return; }
    setNewDate((p) => ({ ...p, [month]: { date: "", time: "" } }));
    toast.success("Data adicionada");
    load();
  };

  const removeSlot = async (id: string) => {
    if (!confirm("Remover esta data?")) return;
    await supabase.from("welcome_meeting_slots").delete().eq("id", id);
    load();
  };

  const toggleAttendance = async (booking: Booking) => {
    const { error } = await supabase.rpc("confirm_attendance", { _booking_id: booking.id, _attended: !booking.attended });
    if (error) { toast.error(error.message); return; }
    toast.success(!booking.attended ? "Presença confirmada" : "Presença removida");
    load();
  };

  if (loading) return <div className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Cadastre datas e horários disponíveis em cada mês. Conforme os voluntários escolherem, eles aparecerão aqui.</p>
      {MONTHS.map((name, idx) => {
        const month = idx + 1;
        const monthSlots = slots.filter((s) => s.month === month);
        const open = openMonth === month;
        return (
          <div key={month} className="glass-card rounded-xl overflow-hidden">
            <button onClick={() => setOpenMonth(open ? null : month)} className="w-full p-3 text-left flex justify-between items-center">
              <span className="font-medium text-sm">{name}</span>
              <span className="text-xs text-muted-foreground">{monthSlots.length} datas</span>
            </button>
            {open && (
              <div className="p-3 pt-0 space-y-3 border-t">
                <div className="flex gap-1.5 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground">Data</label>
                    <Input type="date" className="h-8 text-xs" value={newDate[month]?.date || ""} onChange={(e) => setNewDate((p) => ({ ...p, [month]: { ...p[month], date: e.target.value, time: p[month]?.time || "" } }))} />
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] text-muted-foreground">Horário</label>
                    <Input type="time" className="h-8 text-xs" value={newDate[month]?.time || ""} onChange={(e) => setNewDate((p) => ({ ...p, [month]: { date: p[month]?.date || "", time: e.target.value } }))} />
                  </div>
                  <Button size="sm" className="h-8" onClick={() => addSlot(month)}><Plus className="h-3.5 w-3.5" /></Button>
                </div>

                {monthSlots.map((s) => {
                  const slotBookings = bookings.filter((b) => b.slot_id === s.id);
                  return (
                    <div key={s.id} className="bg-muted/30 rounded-lg p-2.5 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="text-xs font-medium">
                          {new Date(s.slot_date + "T00:00:00").toLocaleDateString("pt-BR", { day:"2-digit", month:"short", weekday:"short" })} · {s.slot_time.slice(0,5)}
                        </div>
                        <button onClick={() => removeSlot(s.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Os voluntários que participarão nesse dia serão:</p>
                      {slotBookings.length === 0 ? (
                        <p className="text-[10px] italic text-muted-foreground">Ninguém ainda.</p>
                      ) : (
                        <ul className="space-y-1">
                          {slotBookings.map((b) => (
                            <li key={b.id} className="flex items-center gap-2 text-xs bg-card rounded p-2">
                              <button
                                onClick={() => toggleAttendance(b)}
                                className={`h-5 w-5 rounded border-2 flex items-center justify-center ${b.attended ? "bg-primary border-primary" : "border-muted-foreground/40"}`}
                                title="Marcar presença"
                              >
                                {b.attended && <Check className="h-3 w-3 text-primary-foreground" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{b.volunteer_name}</p>
                                <p className="text-[10px] text-muted-foreground">{b.volunteer_phone || "—"}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AdminWelcomeMeetings;
