import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, Loader2, Download, Trophy, ChevronDown, ChevronUp } from "lucide-react";

interface Reg {
  id: string;
  cpf: string;
  full_name: string;
  social_name: string | null;
  whatsapp: string;
  email: string;
  gender: string;
  birth_date: string;
  rg: string;
  marital_status: string;
  city: string;
  neighborhood: string;
  address: string;
  education: string;
  area_of_work: string;
  profession: string;
  works_at_cejam: boolean;
  cejam_unit: string | null;
  how_found_program: string;
  photo_url: string | null;
  shirt_size: string;
  kit_unit: string;
  created_at: string;
  booking_date?: string | null;
  booking_time?: string | null;
}


interface CompletedVolunteer {
  name: string;
  cpf: string;
  completedAt: string; // ISO
}

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const AdminPendingRegistrations = () => {
  const [list, setList] = useState<Reg[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [completed, setCompleted] = useState<CompletedVolunteer[]>([]);
  const [openMonth, setOpenMonth] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: regs } = await supabase
      .from("volunteer_registrations")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    const allRegs = (regs as Reg[]) || [];
    const ids = allRegs.map((r) => r.id);
    let withBooking: Reg[] = [];
    if (ids.length) {
      const { data: bks } = await supabase
        .from("welcome_meeting_bookings")
        .select("registration_id, slot_id")
        .in("registration_id", ids);
      const slotIds = Array.from(new Set((bks || []).map((b: any) => b.slot_id)));
      const slotMap = new Map<string, { slot_date: string; slot_time: string }>();
      if (slotIds.length) {
        const { data: sls } = await supabase
          .from("welcome_meeting_slots")
          .select("id, slot_date, slot_time")
          .in("id", slotIds);
        (sls || []).forEach((s: any) => slotMap.set(s.id, { slot_date: s.slot_date, slot_time: s.slot_time }));
      }
      const bookingByReg = new Map<string, { slot_date: string; slot_time: string }>();
      (bks || []).forEach((b: any) => {
        const sl = slotMap.get(b.slot_id);
        if (sl && b.registration_id) bookingByReg.set(b.registration_id, sl);
      });
      withBooking = allRegs
        .filter((r) => bookingByReg.has(r.id))
        .map((r) => ({ ...r, booking_date: bookingByReg.get(r.id)!.slot_date, booking_time: bookingByReg.get(r.id)!.slot_time }));
    }
    setList(withBooking);


    // Completed = voluntagram access approved (final step before going to Base)
    const { data: reqs } = await supabase
      .from("voluntagram_access_requests")
      .select("registration_id, reviewed_at, status")
      .eq("status", "approved")
      .not("reviewed_at", "is", null);
    const regIds = Array.from(new Set((reqs || []).map((r: any) => r.registration_id).filter(Boolean)));
    let nameMap = new Map<string, { full_name: string; cpf: string }>();
    if (regIds.length) {
      const { data: regs } = await supabase
        .from("volunteer_registrations")
        .select("id, full_name, cpf")
        .in("id", regIds);
      nameMap = new Map((regs || []).map((r: any) => [r.id, { full_name: r.full_name, cpf: r.cpf }]));
    }
    const completedList: CompletedVolunteer[] = (reqs || [])
      .map((r: any) => {
        const reg = nameMap.get(r.registration_id);
        if (!reg) return null;
        return { name: reg.full_name, cpf: reg.cpf, completedAt: r.reviewed_at } as CompletedVolunteer;
      })
      .filter(Boolean) as CompletedVolunteer[];
    setCompleted(completedList);

    setLoading(false);
  };

  useEffect(() => { load(); }, []);


  const approve = async (id: string) => {
    setActing(id);
    const { error } = await supabase.rpc("approve_registration", { _id: id });
    setActing(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Cadastro aprovado");
    setList((p) => p.filter((r) => r.id !== id));
  };

  const reject = async (id: string) => {
    const reason = prompt("Motivo da rejeição (opcional):") || null;
    setActing(id);
    const { error } = await supabase.rpc("reject_registration", { _id: id, _reason: reason });
    setActing(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Cadastro rejeitado");
    setList((p) => p.filter((r) => r.id !== id));
  };

  const exportXlsx = async () => {
    const { data } = await supabase.from("volunteer_registrations").select("*").order("created_at", { ascending: false });
    const rows = (data || []).map((r: any) => ({
      "Nome completo": r.full_name,
      "Nome social": r.social_name || "",
      "WhatsApp": r.whatsapp,
      "E-mail": r.email,
      "Gênero": r.gender,
      "Data de nascimento": r.birth_date,
      "RG": r.rg,
      "CPF": r.cpf,
      "Estado civil": r.marital_status,
      "Município em que reside": r.city,
      "Bairro": r.neighborhood,
      "Rua, número ou complemento": r.address,
      "Escolaridade": r.education,
      "Área de atuação": r.area_of_work,
      "Profissão": r.profession,
      "Trabalha no CEJAM": r.works_at_cejam ? "Sim" : "Não",
      "Qual unidade?": r.cejam_unit || "",
      "Como conheceu o programa": r.how_found_program,
      "Foto para credencial (URL)": r.photo_url || "",
      "Tamanho da camiseta": r.shirt_size,
      "Unidade para envio do Kit": r.kit_unit,
      "Aceitou os termos": r.agreed_terms ? "Sim" : "Não",
      "Status": r.status,
      "Data do cadastro": new Date(r.created_at).toLocaleString("pt-BR"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Voluntários");
    XLSX.writeFile(wb, `voluntarios_cadastros_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Planilha exportada");
  };

  const currentYear = new Date().getFullYear();
  const byMonth = (m: number) =>
    completed.filter((c) => {
      const d = new Date(c.completedAt);
      return d.getFullYear() === currentYear && d.getMonth() + 1 === m;
    });

  return (
    <div className="space-y-5">
      <Button variant="outline" size="sm" className="w-full" onClick={exportXlsx}>
        <Download className="h-3.5 w-3.5 mr-1.5" />Exportar todos os cadastros (Excel)
      </Button>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">Novos cadastros</h2>
        {loading ? (
          <p className="text-center text-muted-foreground py-6 text-sm">Carregando...</p>
        ) : list.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Nenhum cadastro pendente.</p>
        ) : list.map((r) => (
          <div key={r.id} className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex gap-3">
              {r.photo_url && <img src={r.photo_url} alt={r.full_name} className="w-16 h-16 rounded-full object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{r.full_name}</p>
                {r.social_name && <p className="text-xs text-muted-foreground">Nome social: {r.social_name}</p>}
                <p className="text-xs text-muted-foreground font-mono">CPF {r.cpf}</p>
                <p className="text-xs text-muted-foreground">{r.email} · {r.whatsapp}</p>
              </div>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-primary font-medium">Ver todos os dados</summary>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-xs">
                <Info l="RG" v={r.rg} />
                <Info l="Nascimento" v={r.birth_date} />
                <Info l="Gênero" v={r.gender} />
                <Info l="Estado civil" v={r.marital_status} />
                <Info l="Cidade" v={r.city} />
                <Info l="Bairro" v={r.neighborhood} />
                <Info l="Endereço" v={r.address} />
                <Info l="Escolaridade" v={r.education} />
                <Info l="Área" v={r.area_of_work} />
                <Info l="Profissão" v={r.profession} />
                <Info l="Trabalha CEJAM" v={r.works_at_cejam ? `Sim (${r.cejam_unit || "—"})` : "Não"} />
                <Info l="Camiseta" v={r.shirt_size} />
                <Info l="Unidade kit" v={r.kit_unit} />
                <Info l="Conheceu por" v={r.how_found_program} />
              </dl>
            </details>
            <div className="flex gap-2">
              <Button size="sm" variant="hero" className="flex-1" onClick={() => approve(r.id)} disabled={acting === r.id}>
                {acting === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" />Aprovar</>}
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={() => reject(r.id)} disabled={acting === r.id}>
                <X className="h-3.5 w-3.5 mr-1" />Rejeitar
              </Button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Novos voluntários que completaram capacitação
        </h2>
        <p className="text-xs text-muted-foreground">
          Voluntários do ano {currentYear} agrupados pelo mês em que concluíram reunião de boas vindas, capacitação magna e vídeo de integração.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {MONTHS.map((name, idx) => {
            const month = idx + 1;
            const items = byMonth(month);
            const isOpen = openMonth === month;
            return (
              <button
                key={month}
                onClick={() => setOpenMonth(isOpen ? null : month)}
                className={`glass-card rounded-xl p-3 text-left transition ${isOpen ? "col-span-2 border-primary/40 border" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">{name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {items.length}
                    {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </span>
                </div>
                {isOpen && (
                  <div className="mt-2 space-y-1">
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Nenhum voluntário concluiu neste mês.</p>
                    ) : items.map((c, i) => (
                      <div key={i} className="text-xs border-t pt-1">
                        <p className="font-medium text-foreground">{c.name}</p>
                        <p className="text-muted-foreground font-mono">{c.cpf}</p>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

const Info = ({ l, v }: { l: string; v: string }) => (
  <>
    <dt className="text-muted-foreground">{l}</dt>
    <dd className="text-foreground truncate">{v}</dd>
  </>
);

export default AdminPendingRegistrations;
