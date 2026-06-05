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
      const { data: registrationId, error } = await (supabase.rpc as any)("submit_volunteer_registration", {
        _cpf: d.cpf,
        _full_name: d.full_name,
        _social_name: d.social_name || null,
        _whatsapp: d.whatsapp,
        _email: d.email,
        _gender: d.gender,
        _birth_date: d.birth_date,
        _rg: d.rg,
        _marital_status: d.marital_status,
        _city: d.city,
        _neighborhood: d.neighborhood,
        _address: d.address,
        _education: d.education,
        _area_of_work: d.area_of_work,
        _profession: d.profession,
        _works_at_cejam: d.works_at_cejam,
        _cejam_unit: f.works_at_cejam === "sim" ? f.cejam_unit.trim() : null,
        _how_found_program: d.how_found_program,
        _shirt_size: d.shirt_size,
        _kit_unit: d.kit_unit,
        _agreed_terms: d.agreed_terms,
        _photo_url: pub.publicUrl,
      });
      if (error) throw error;
      toast.success("Cadastro enviado!");
      try { localStorage.setItem("known_user_cpf", cpfDigits); } catch {}
      navigate("/boas-vindas/agendar", {
        state: {
          registrationId,
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

        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4 max-h-80 overflow-y-auto text-xs leading-relaxed text-foreground/90">
          <h3 className="text-sm font-bold font-heading text-center">ACEITE DOS TERMOS ABAIXO</h3>
          <p className="font-semibold text-center">TERMO DE ADESÃO AO PROGRAMA DE VOLUNTARIADO CEJAM E A CAPACITAÇÃO MAGNA</p>
          <p>O Termo de Adesão ao Voluntariado estabelece as diretrizes legais para o vínculo de trabalho voluntário, baseado na Lei nº 9608 de 18/02/1998.</p>
          <p>Após o preenchimento da ficha de cadastro, nossa equipe entrará em contato para que você possa ter acesso ao termo de adesão e participar de nossa Capacitação Magna para Voluntários.</p>

          <p className="font-semibold mt-2">Lei do Voluntariado – Lei nº 9.608, de 18 de fevereiro de 1998</p>
          <p>Dispõe sobre o serviço voluntário e dá outras providências</p>
          <p><b>Art. 1°</b> – Considera-se serviço voluntário, para fins desta Lei, a atividade não remunerada, prestada por pessoa física a entidade pública de qualquer natureza, ou a Instituição privada de fins não lucrativos, que tenha objetivos cívicos, culturais, educacionais, científicos, recreativos ou de assistência social, inclusive mutualidade. Parágrafo único. O serviço voluntário não gera vínculo empregatício, nem obrigação de natureza trabalhista, previdenciária ou afim.</p>
          <p><b>Art. 2°</b> – O serviço voluntário será exercido mediante a celebração de Termo de Adesão entre a entidade, pública ou privada, e o prestador do serviço voluntário, dele devendo constar o objeto e as condições de seu exercício.</p>
          <p><b>Art. 3°</b> – O prestador de serviço voluntário poderá ser ressarcido pelas despesas que comprovadamente realizar no desempenho das atividades voluntárias. Parágrafo único. As despesas a serem ressarcidas deverão estar expressamente autorizadas pela entidade a que for prestado o serviço voluntário.</p>
          <p><b>Art. 4°</b> – Esta Lei entra em vigor na data de sua publicação.</p>
          <p><b>Art. 5°</b> – Revogam-se as disposições em contrário.</p>
          <p>Fernando Henrique Cardoso. Brasília, 18 de fevereiro de 1998; 177º da Independência e 110º da República.</p>

          <p className="font-semibold mt-2">Alteração – Lei nº 13.297, de 16 de junho de 2016</p>
          <p>O Ato em referência altera o artigo 1º da Lei 9.608, de 18/02/98, para incluir a assistência à pessoa como objetivo de atividade não remunerada reconhecida como serviço voluntário.</p>
          <p><b>Art. 1º</b> O caput do art. 1º da Lei nº 9.608, de 18 de fevereiro de 1998, passa a vigorar com a seguinte redação: "Art. 1º Considera-se serviço voluntário, para os fins desta Lei, a atividade não remunerada prestada por pessoa física a entidade pública de qualquer natureza ou a instituição privada de fins não lucrativos que tenha objetivos cívicos, culturais, educacionais, científicos, recreativos ou de assistência à pessoa."</p>
          <p><b>Art. 2º</b> Esta Lei entra em vigor na data de sua publicação.</p>
          <p>Michel Temer, Alexandre de Moraes, Ronaldo Nogueira de Oliveira. Brasília, 16 de junho de 2016.</p>

          <p className="font-semibold mt-2">TRATAMENTO DE DADOS PESSOAIS: ESCLARECIMENTOS ACERCA DA FINALIDADE, PRAZO E USO DA IMAGEM</p>
          <p className="italic">Disposições acerca da Lei Geral de Proteção de Dados</p>
          <p><b>Art. 1º Finalidade:</b> O fornecimento dos dados pessoais do titular a serem preenchidos neste termo tem como finalidade a formalização de seu cadastro, identificação e poderão ser utilizados para atividade relacionadas ao regular, como controle de acesso, emissão de crachás, emissão de eventual certificado e outras atividades, não se limitando a essas, mas que necessitarem de identificação pessoal.</p>
          <p>Parágrafo Único: seus dados poderão ser compartilhados com parceiros em atividades exclusivamente relacionadas à função, como emissão de cartões, acessos a edifícios e outros.</p>
          <p><b>Art. 2º Prazo:</b> Enquanto perdurar a atividade, devidamente formalizada e em vigor, entre o titular dos dados e o CEJAM e empresa empregada, haverá o tratamento desses dados em conformidade com as finalidades acima.</p>
          <p><b>Art. 3º Uso de Imagem:</b> O titular manifesta consentimento de uso de sua imagem para as finalidades aqui dispostas, fornecendo-o de forma gratuita e livre.</p>
          <p><b>Art. 4º Consentimento:</b> Ao preencher este formulário, o titular expressa seu consentimento para o uso e tratamento de seus dados pessoais que serão realizados conforme as finalidades e durante o prazo aqui estabelecido.</p>
          <p>Parágrafo Único: O consentimento ao tratamento dos dados pessoais poderá ser revogado pelo titular a qualquer momento, situação em que CEJAM cessará o tratamento e será encerrada a respectiva participação do titular nas atividades de voluntariado.</p>

          <p className="font-semibold mt-2">TERMO DE CONFIDENCIALIDADE</p>
          <p>Exercendo a função de voluntário, por meio do presente Termo, comprometo-me:</p>
          <p>a) manter absoluto sigilo acerca de todas as informações administrativas, técnicas contábeis, fiscais e cadastrais da organização, dos clientes internos e externos e usuários dos serviços de saúde desta, bem como de dados, documentos, procedimentos e informações a que tenha acesso ou que venha a ter conhecimento por qualquer meio, ainda que não pertinentes ou diretamente vinculados às minhas atividades, compromisso esse que se estende mesmo após encerradas minhas atividades de voluntariado no CEJAM;</p>
          <p>b) seguir as diretrizes, políticas, treinamentos e instruções ministrados pela entidade quanto às normas de Governança Corporativa, Programa de Integridade e Programa de Conformidade LGPD, principalmente em assuntos relacionados à confidencialidade de informações que vier a ter acesso em virtude de minhas atividades de voluntariado no CEJAM;</p>
          <p>c) a reconhecer que pertence exclusivamente à Instituição, clientes e fornecedores desta os programas de computador disponibilizados, bem como os direitos de autoria e de propriedade, incluindo códigos-fontes, bases de dados, derivativos, rotinas ou aplicativos desenvolvidos a partir dos programas, documentação, desenhos, informações técnicas, patentes, marcas, material de propaganda, análises de marketing, lista de clientes e usuários dos serviços de saúde, sendo que todos têm caráter de informação confidencial e sigilosa, obrigando-se, assim, a não divulgá-los, copiá-los, cedê-los, transferi-los ou torná-los disponíveis a terceiros, sob qualquer hipótese, tampouco utilizá-los, em benefício próprio ou de terceiros, mesmo após encerradas minhas atividades de voluntariado no CEJAM;</p>
          <p>d) caso me seja franqueado acesso e autorização a utilizar a rede interna de computadores da Instituição ou softwares ERP, entre outros relacionados e não limitados a estes, ou de onde estiver desenvolvendo minhas atividades, tendo acesso ao correio eletrônico, à internet além de banco de dados da instituição, obrigo-me a fazer uso comedido de tais recursos e estritamente no limite das necessidades do serviço, sendo expressamente vedada a utilização de tais meios de comunicação e informação para finalidades pessoais ou estranhas às atividades a serem desenvolvidas durante minhas atividades no CEJAM. Comprometo-me, ainda, a não veicular dados, informações ou mensagens injuriosas da Instituição, seus colaboradores, fornecedores e/ou demais interessados internos e externos.</p>
          <p>e) estou ciente que a infração a estas normas constitui falta funcional punível administrativamente, sem prejuízo da responsabilidade penal e civil de acordo com a Legislação vigente, responsabilizando-me, inclusive, pelos danos que vier causar à Instituição ou a terceiros, em decorrência do uso indevido das informações por mim acessadas.</p>

          <p className="font-semibold mt-2">CONDIÇÕES GERAIS:</p>
          <p>O trabalho voluntário a ser desempenhado junto ao PROGRAMA DE VOLUNTARIADO CEJAM de acordo com a Lei nº 9.608 de 18/02/98, é atividade não remunerada, e não gera vínculo empregatício nem funcional, ou quaisquer obrigações trabalhistas e previdenciárias ou afins;</p>
          <p>É imprescindível a participação do voluntário na capacitação magna do PROGRAMA DE VOLUNTARIADO CEJAM, bem como dos cursos de treinamento oferecidos para cada projeto. Podendo ao INSTITUTO CEJAM interromper a participação de voluntários que não estiverem devidamente capacitados para atuação.</p>
          <p>Compete ao Voluntário participar das atividades e cumprir com empenho e interesse a função estabelecida. A discordância ou o descumprimento das normas estabelecidas no Regimento Interno acarretará o afastamento ou desligamento do voluntário;</p>
          <p>Será de inteira responsabilidade do voluntário qualquer dano ou prejuízo que vier a causar ao PROGRAMA DE VOLUNTARIADO CEJAM;</p>
          <p>O voluntário isenta o INSTITUTO CEJAM de qualquer responsabilidade referente a acidentes pessoais ou materiais, que por ventura, venham a ocorrer no desempenho de suas atividades;</p>
          <p>O trabalho voluntário não poderá ultrapassar 08 (oito) horas semanais.</p>

          <p className="font-semibold mt-2">CONDIÇÕES PARA O DESLIGAMENTO:</p>
          <p>O desligamento do voluntário poderá ocorrer sob as seguintes condições:</p>
          <p><b>Por iniciativa do voluntário:</b> O voluntário tem o direito de se desligar do programa a qualquer momento, mediante manifestação de vontade e assinatura do Termo de Desligamento.</p>
          <p><b>Por iniciativa do Instituto CEJAM:</b> O Instituto poderá desligar o voluntário em caso de:</p>
          <p>– Quebra de ética ou conduta incompatível com os valores do Instituto;</p>
          <p>– Violação das leis de voluntariado;</p>
          <p>– Ausência de engajamento, incluindo: ausência nas atividades e ações; falta de resposta após três tentativas de contato (mensagem, ligação ou e-mail).</p>
          <p>O desligamento será formalizado mediante a assinatura do Termo de Desligamento. Nos casos em que não seja possível o contato com o voluntário, o Termo será assinado pelo Gestor de Voluntariado e pela Gerente do Instituto.</p>
          <p>O presente Termo de Adesão estará em vigor por 01 (um) ano, quando deverá ser renovado, caso seja de interesse de ambas as partes. Declaro estar ciente da legislação específica, termos em anexo, regimento interno e descritivo de função, e que aceito atuar como voluntário conforme este Termo de Adesão.</p>

          <p className="font-semibold mt-2">DECLARAÇÃO DE RECEBIMENTO, LEITURA E OBSERVÂNCIA AO CÓDIGO DE ÉTICA CEJAM</p>
          <p className="italic">Disposições acerca do Programa de Integridade – CEJAM</p>
          <p>O CEJAM possui programa de integridade zelando em questões relacionadas ao combate à corrupção, ética nos serviços realizados, gerenciamento de riscos e conformidade com normas internas e externas que são abordadas de maneira integrada e tratadas consistentemente como forma de assegurar a sustentabilidade diante dos pilares estratégicos do CEJAM - Atenção Primária em Saúde, Sinergia da Rede de Serviços, Equipe Multidisciplinar, Tecnologia da Informação e Geração e Disseminação de Conhecimento.</p>
          <p>Para que a entidade atinja seus objetivos, missão, visão e valores, é fundamental que as pessoas físicas e jurídicas participantes de suas atividades estejam em rigorosa sintonia com a legislação nacional, principalmente leis anticorrupção, como Lei N° 12.846/2013, seu respectivo regulamento disciplinado pelo Decreto Presidencial N° 8.420/2015, lei de improbidade administrativa e Lei Geral de Proteção de Dados, não se limitando a estas.</p>
          <p><b>Declaração de recebimento, leitura e observância ao código de ética CEJAM:</b> Em conformidade com o Programa de Integridade – CEJAM, declaro que recebi acesso ao link do Código de ética do CEJAM e/ou sua cópia, expresso meu compromisso a seguir suas disposições, incentivar meus colegas no mesmo sentido e, sempre que necessário, consultar o referido documento para esclarecimentos de dúvidas.</p>
          <p>Link Código de Ética e Conduta – CEJAM: <a href="https://cejam.org.br/codigo-etica-conduta" target="_blank" rel="noopener noreferrer" className="text-primary underline">https://cejam.org.br/codigo-etica-conduta</a></p>
        </div>

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
