import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { formatCPF, isValidCPF, onlyDigits } from "@/lib/cpf";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().trim().min(3).max(150),
  social_name: z.string().trim().max(150).optional().or(z.literal("")),
  whatsapp: z.string().trim().min(10).max(20),
  email: z.string().trim().email().max(255),
  gender: z.string().min(1),
  birth_date: z.string().min(1),
  rg: z.string().trim().min(4).max(20),
  cpf: z.string().refine(isValidCPF, "CPF inválido"),
  marital_status: z.string().min(1),
  city: z.string().trim().min(2).max(120),
  neighborhood: z.string().trim().min(2).max(120),
  address: z.string().trim().min(3).max(200),
  education: z.string().min(1),
  area_of_work: z.string().trim().min(2).max(120),
  profession: z.string().trim().min(2).max(120),
  works_at_cejam: z.boolean(),
  cejam_unit: z.string().optional(),
  how_found_program: z.string().trim().min(2).max(200),
  shirt_size: z.string().min(1),
  kit_unit: z.string().trim().min(2).max(120),
  agreed_terms: z.literal(true, { errorMap: () => ({ message: "É necessário aceitar os termos" }) }),
});

type FormState = {
  full_name: string; social_name: string; whatsapp: string; email: string; gender: string;
  birth_date: string; rg: string; marital_status: string; city: string; neighborhood: string;
  address: string; education: string; area_of_work: string; profession: string;
  works_at_cejam: "sim" | "nao" | ""; cejam_unit: string; how_found_program: string;
  shirt_size: string; kit_unit: string; agreed_terms: boolean;
};

const initial: FormState = {
  full_name: "", social_name: "", whatsapp: "", email: "", gender: "", birth_date: "",
  rg: "", marital_status: "", city: "", neighborhood: "", address: "", education: "",
  area_of_work: "", profession: "", works_at_cejam: "", cejam_unit: "", how_found_program: "",
  shirt_size: "", kit_unit: "", agreed_terms: false,
};

const CadastroCompleto = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillCpf = (location.state as { cpf?: string } | null)?.cpf || "";
  const [cpf, setCpf] = useState(formatCPF(prefillCpf));
  const [f, setF] = useState<FormState>(initial);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto até 5MB"); return; }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpfDigits = onlyDigits(cpf);
    const parsed = schema.safeParse({
      ...f,
      cpf: cpfDigits,
      rg: onlyDigits(f.rg),
      whatsapp: onlyDigits(f.whatsapp),
      works_at_cejam: f.works_at_cejam === "sim",
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first?.message || "Preencha todos os campos obrigatórios");
      return;
    }
    if (f.works_at_cejam === "sim" && !f.cejam_unit.trim()) {
      toast.error("Informe a unidade do CEJAM");
      return;
    }
    if (!photo) { toast.error("Envie uma foto para a credencial"); return; }

    setLoading(true);
    try {
      // Upload foto
      const ext = photo.name.split(".").pop() || "jpg";
      const path = `volunteer-registrations/${cpfDigits}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, photo, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);

      const d = parsed.data;
      const { data: inserted, error } = await supabase.from("volunteer_registrations").insert({
        cpf: d.cpf,
        full_name: d.full_name,
        social_name: d.social_name || null,
        whatsapp: d.whatsapp,
        email: d.email,
        gender: d.gender,
        birth_date: d.birth_date,
        rg: d.rg,
        marital_status: d.marital_status,
        city: d.city,
        neighborhood: d.neighborhood,
        address: d.address,
        education: d.education,
        area_of_work: d.area_of_work,
        profession: d.profession,
        works_at_cejam: d.works_at_cejam,
        cejam_unit: f.works_at_cejam === "sim" ? f.cejam_unit.trim() : null,
        how_found_program: d.how_found_program,
        shirt_size: d.shirt_size,
        kit_unit: d.kit_unit,
        agreed_terms: d.agreed_terms,
        photo_url: pub.publicUrl,
      }).select("id").single();
      if (error) throw error;
      toast.success("Cadastro enviado!");
      navigate("/boas-vindas/agendar", {
        state: {
          registrationId: inserted.id,
          cpf: cpfDigits,
          fullName: d.full_name,
          phone: d.whatsapp,
          email: d.email,
        },
      });
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar cadastro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="gradient-hero px-5 pt-10 pb-5 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold font-heading text-primary-foreground">Cadastro de Voluntário</h1>
        </div>
        <p className="text-xs text-primary-foreground/80 mt-2">Todos os campos são obrigatórios.</p>
      </div>

      <form onSubmit={submit} className="px-5 mt-5 space-y-4 max-w-md mx-auto">
        {/* Foto */}
        <div className="flex flex-col items-center mb-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-24 h-24 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary transition"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <Camera className="h-7 w-7 text-muted-foreground" />
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
          <p className="text-xs text-muted-foreground mt-2">Foto para credencial</p>
        </div>

        <Field label="Nome completo"><Input value={f.full_name} onChange={(e) => set("full_name", e.target.value)} required /></Field>
        <Field label="Nome social"><Input value={f.social_name} onChange={(e) => set("social_name", e.target.value)} /></Field>
        <Field label="WhatsApp"><Input inputMode="tel" value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} required /></Field>
        <Field label="E-mail"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} required /></Field>

        <Field label="Gênero">
          <SelectField value={f.gender} onChange={(v) => set("gender", v)} options={["Feminino","Masculino","Não-binário","Prefiro não informar","Outro"]} />
        </Field>

        <Field label="Data de nascimento"><Input type="date" value={f.birth_date} onChange={(e) => set("birth_date", e.target.value)} required /></Field>
        <Field label="RG (sem pontos e traços)"><Input inputMode="numeric" value={f.rg} onChange={(e) => set("rg", onlyDigits(e.target.value))} required /></Field>
        <Field label="CPF (sem pontos e traços)">
          <Input inputMode="numeric" value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} maxLength={14} required />
        </Field>

        <Field label="Estado civil">
          <SelectField value={f.marital_status} onChange={(v) => set("marital_status", v)} options={["Solteiro(a)","Casado(a)","Divorciado(a)","Viúvo(a)","União estável","Outro"]} />
        </Field>

        <Field label="Município em que reside"><Input value={f.city} onChange={(e) => set("city", e.target.value)} required /></Field>
        <Field label="Bairro"><Input value={f.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} required /></Field>
        <Field label="Rua, número ou complemento"><Input value={f.address} onChange={(e) => set("address", e.target.value)} required /></Field>

        <Field label="Escolaridade">
          <SelectField value={f.education} onChange={(v) => set("education", v)} options={["Fundamental incompleto","Fundamental completo","Médio incompleto","Médio completo","Superior incompleto","Superior completo","Pós-graduação"]} />
        </Field>

        <Field label="Área de atuação"><Input value={f.area_of_work} onChange={(e) => set("area_of_work", e.target.value)} required /></Field>
        <Field label="Profissão"><Input value={f.profession} onChange={(e) => set("profession", e.target.value)} required /></Field>

        <Field label="Você trabalha no CEJAM?">
          <SelectField value={f.works_at_cejam} onChange={(v) => set("works_at_cejam", v as any)} options={[{label:"Sim", value:"sim"},{label:"Não", value:"nao"}]} />
        </Field>

        {f.works_at_cejam === "sim" && (
          <Field label="Qual unidade?"><Input value={f.cejam_unit} onChange={(e) => set("cejam_unit", e.target.value)} required /></Field>
        )}

        <Field label="Como você conheceu o programa de Voluntariado?">
          <Input value={f.how_found_program} onChange={(e) => set("how_found_program", e.target.value)} required />
        </Field>

        <Field label="Tamanho da camiseta">
          <SelectField value={f.shirt_size} onChange={(v) => set("shirt_size", v)} options={["PP","P","M","G","GG","XG"]} />
        </Field>

        <Field label="Qual unidade mais próxima podemos enviar o Kit?">
          <Input value={f.kit_unit} onChange={(e) => set("kit_unit", e.target.value)} required />
        </Field>

        <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
          <Checkbox checked={f.agreed_terms} onCheckedChange={(c) => set("agreed_terms", !!c)} className="mt-0.5" />
          <span className="text-sm">Declaro que li e estou de acordo com todas as informações apresentadas acima.</span>
        </label>

        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar cadastro"}
        </Button>
      </form>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm">{label}</Label>
    {children}
  </div>
);

type Option = string | { label: string; value: string };
const SelectField = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Option[] }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
    <SelectContent>
      {options.map((opt) => {
        const o = typeof opt === "string" ? { label: opt, value: opt } : opt;
        return <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>;
      })}
    </SelectContent>
  </Select>
);

export default CadastroCompleto;
