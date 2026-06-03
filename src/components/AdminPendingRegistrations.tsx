import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, Loader2, Download } from "lucide-react";

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
}

const AdminPendingRegistrations = () => {
  const [list, setList] = useState<Reg[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("volunteer_registrations")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setList((data as Reg[]) || []);
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

  return (
    <div className="space-y-3">
      <Button variant="outline" size="sm" className="w-full" onClick={exportXlsx}>
        <Download className="h-3.5 w-3.5 mr-1.5" />Exportar todos os cadastros (Excel)
      </Button>
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
