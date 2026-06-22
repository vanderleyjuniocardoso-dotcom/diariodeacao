import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, ClipboardPaste, Search, Trash2, Loader2 } from "lucide-react";
import { onlyDigits, isValidCPF } from "@/lib/cpf";

interface Row {
  cpf: string;
  full_name: string;
  credencial: string | null;
  phone: string | null;
  profession: string | null;
  ggl_id: string | null;
}
interface GglOpt { id: string; unit_name: string; }

type ImportRow = { cpf: string; full_name: string; credencial: string | null; phone: string | null; profession: string | null; ggl_id: string | null };

const AdminAuthorizedBase = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [ggls, setGgls] = useState<GglOpt[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<{ valid: ImportRow[]; invalid: string[] } | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: g }] = await Promise.all([
      supabase.from("admin_volunteers").select("*").order("full_name"),
      supabase.from("ggl_groups").select("id, unit_name").order("unit_name"),
    ]);
    setRows((data as Row[]) || []);
    setGgls((g as GglOpt[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    const digits = onlyDigits(q);
    return rows.filter((r) =>
      r.full_name.toLowerCase().includes(q) ||
      (!!digits && r.cpf.includes(digits)) ||
      (r.credencial || "").toLowerCase().includes(q) ||
      (r.profession || "").toLowerCase().includes(q)
    );
  }, [filter, rows]);

  const gglByName = useMemo(() => {
    const m = new Map<string, string>();
    ggls.forEach((g) => m.set(g.unit_name.toLowerCase().trim(), g.id));
    return m;
  }, [ggls]);

  const parseRows = (raw: string[][]): { valid: ImportRow[]; invalid: string[] } => {
    const valid: ImportRow[] = [];
    const invalid: string[] = [];
    const seen = new Set<string>();
    const first = raw[0]?.map((s) => String(s).toLowerCase()) || [];
    const hasHeader = first.some((c) => c.includes("cpf") || c.includes("nome") || c.includes("credencial") || c.includes("telefone") || c.includes("profiss") || c.includes("ggl"));
    let nameIdx = 0, cpfIdx = 1, credIdx = 2, phoneIdx = 3, profIdx = 4, gglIdx = 5;
    if (hasHeader) {
      first.forEach((h, i) => {
        if (h.includes("cpf")) cpfIdx = i;
        else if (h.includes("nome")) nameIdx = i;
        else if (h.includes("credencial")) credIdx = i;
        else if (h.includes("telefone") || h.includes("whats") || h.includes("celular")) phoneIdx = i;
        else if (h.includes("profiss")) profIdx = i;
        else if (h.includes("ggl") || h.includes("grupo")) gglIdx = i;
      });
    }
    const data = hasHeader ? raw.slice(1) : raw;
    data.forEach((row, idx) => {
      const name = String(row[nameIdx] ?? "").trim();
      const cpf = onlyDigits(String(row[cpfIdx] ?? ""));
      const cred = (row[credIdx] != null ? String(row[credIdx]).trim() : "") || null;
      const phone = (row[phoneIdx] != null ? String(row[phoneIdx]).trim() : "") || null;
      const profession = (row[profIdx] != null ? String(row[profIdx]).trim() : "") || null;
      const gglRaw = (row[gglIdx] != null ? String(row[gglIdx]).trim() : "");
      const ggl_id = gglRaw ? (gglByName.get(gglRaw.toLowerCase()) ?? null) : null;
      if (!name || !cpf) return;
      if (!isValidCPF(cpf)) { invalid.push(`Linha ${idx + 1}: CPF inválido (${cpf})`); return; }
      if (seen.has(cpf)) return;
      seen.add(cpf);
      valid.push({ cpf, full_name: name, credencial: cred, phone, profession, ggl_id });
    });
    return { valid, invalid };
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false }) as string[][];
    setPreview(parseRows(json));
    e.target.value = "";
  };

  const onPaste = () => {
    const lines = pasteText.split(/\r?\n/).filter((l) => l.trim());
    const raw = lines.map((l) => l.split(/\t|,|;/));
    setPreview(parseRows(raw));
  };

  const confirmImport = async () => {
    if (!preview?.valid.length) return;
    setImporting(true);
    const chunkSize = 500;
    let inserted = 0;
    for (let i = 0; i < preview.valid.length; i += chunkSize) {
      const chunk = preview.valid.slice(i, i + chunkSize);
      const { error } = await supabase.from("admin_volunteers").upsert(chunk, { onConflict: "cpf" });
      if (error) { toast.error(`Erro: ${error.message}`); setImporting(false); return; }
      inserted += chunk.length;
    }
    toast.success(`${inserted} voluntários importados`);
    setPreview(null);
    setPasteText("");
    setShowPaste(false);
    setImporting(false);
    load();
  };

  const remove = async (cpf: string) => {
    if (!confirm("Remover esse voluntário e apagar todo o cadastro, login e histórico dele no app?")) return;
    const { error } = await supabase.rpc("delete_authorized_volunteer" as any, { _cpf: cpf });
    if (error) { toast.error(error.message); return; }
    toast.success("Voluntário excluído completamente");
    setRows((p) => p.filter((r) => r.cpf !== cpf));
  };

  const removeAll = async () => {
    if (!rows.length) return;
    const msg = `Tem certeza que deseja EXCLUIR TODOS os ${rows.length} voluntários da base autorizada? Esta ação não pode ser desfeita.`;
    if (!confirm(msg)) return;
    const confirmText = prompt('Digite "EXCLUIR TUDO" para confirmar:');
    if (confirmText !== "EXCLUIR TUDO") { toast.error("Confirmação inválida"); return; }
    for (const row of rows) {
      const { error } = await supabase.rpc("delete_authorized_volunteer" as any, { _cpf: row.cpf });
      if (error) { toast.error(`Erro ao excluir ${row.full_name}: ${error.message}`); return; }
    }
    toast.success("Base autorizada esvaziada");
    setRows([]);
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground">Importar voluntários</h3>
          <p className="text-xs text-muted-foreground">Suba uma planilha (.xlsx/.csv) ou cole direto da sua planilha. Colunas esperadas: Nome, CPF, Credencial.</p>
        </div>
        <div className="flex gap-2">
          <label className="flex-1">
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
            <Button asChild variant="outline" size="sm" className="w-full cursor-pointer">
              <span><Upload className="h-3.5 w-3.5 mr-1.5" />Upload planilha</span>
            </Button>
          </label>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowPaste((s) => !s)}>
            <ClipboardPaste className="h-3.5 w-3.5 mr-1.5" />Colar da planilha
          </Button>
        </div>
        {showPaste && (
          <div className="space-y-2">
            <Textarea
              placeholder="Cole as linhas aqui (Nome[TAB]CPF[TAB]Credencial[TAB]Telefone[TAB]Profissão[TAB]GGL)..."
              rows={5}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <Button size="sm" onClick={onPaste} disabled={!pasteText.trim()}>Pré-visualizar</Button>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">
          Colunas aceitas: <b>Nome, CPF, Credencial, Telefone, Profissão, GGL</b>. As 3 últimas são opcionais. O GGL deve bater com o nome de um grupo já cadastrado.
        </p>
      </div>

      {preview && (
        <div className="glass-card rounded-xl p-4 space-y-3 border-2 border-primary/30">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Pré-visualização</h3>
            <button onClick={() => setPreview(null)} className="text-xs text-muted-foreground hover:underline">Cancelar</button>
          </div>
          <p className="text-sm">{preview.valid.length} válidos · {preview.invalid.length} ignorados</p>
          {preview.invalid.length > 0 && (
            <div className="max-h-32 overflow-auto text-xs text-destructive bg-destructive/5 rounded p-2">
              {preview.invalid.slice(0, 10).map((e, i) => <div key={i}>{e}</div>)}
              {preview.invalid.length > 10 && <div>...e mais {preview.invalid.length - 10}</div>}
            </div>
          )}
          <div className="max-h-48 overflow-auto text-xs border rounded">
            <table className="w-full">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2">Nome</th>
                  <th className="text-left p-2">CPF</th>
                  <th className="text-left p-2">Cred.</th>
                  <th className="text-left p-2">Tel.</th>
                  <th className="text-left p-2">Profissão</th>
                  <th className="text-left p-2">GGL</th>
                </tr>
              </thead>
              <tbody>
                {preview.valid.slice(0, 50).map((r) => (
                  <tr key={r.cpf} className="border-t">
                    <td className="p-2">{r.full_name}</td>
                    <td className="p-2 font-mono">{r.cpf}</td>
                    <td className="p-2">{r.credencial || "—"}</td>
                    <td className="p-2">{r.phone || "—"}</td>
                    <td className="p-2">{r.profession || "—"}</td>
                    <td className="p-2">{r.ggl_id ? (ggls.find(g => g.id === r.ggl_id)?.unit_name || "✓") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.valid.length > 50 && <p className="text-center text-muted-foreground py-2">...e mais {preview.valid.length - 50}</p>}
          </div>
          <Button variant="hero" size="sm" className="w-full" onClick={confirmImport} disabled={importing || !preview.valid.length}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Importar ${preview.valid.length} voluntários`}
          </Button>
        </div>
      )}

      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">Base autorizada</h3>
          {rows.length > 0 && (
            <Button variant="destructive" size="sm" onClick={removeAll}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Excluir todos
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, CPF ou credencial..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-10 h-9 text-sm" />
        </div>
        {loading ? (
          <p className="text-center text-muted-foreground py-6 text-sm">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">Nenhum voluntário.</p>
        ) : (
          <div className="max-h-96 overflow-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2">Nome</th>
                  <th className="text-left p-2">CPF</th>
                  <th className="text-left p-2">Cred.</th>
                  <th className="text-left p-2">Tel.</th>
                  <th className="text-left p-2">Profissão</th>
                  <th className="text-left p-2">GGL</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.cpf} className="border-t">
                    <td className="p-2">{r.full_name}</td>
                    <td className="p-2 font-mono text-xs">{r.cpf}</td>
                    <td className="p-2">{r.credencial || "—"}</td>
                    <td className="p-2 text-xs">{r.phone || "—"}</td>
                    <td className="p-2 text-xs">{r.profession || "—"}</td>
                    <td className="p-2">
                      <select
                        value={r.ggl_id || ""}
                        onChange={async (e) => {
                          const newGgl = e.target.value || null;
                          const { error } = await supabase.from("admin_volunteers").update({ ggl_id: newGgl } as any).eq("cpf", r.cpf);
                          if (error) return toast.error(error.message);
                          setRows((prev) => prev.map((x) => x.cpf === r.cpf ? { ...x, ggl_id: newGgl } : x));
                        }}
                        className="text-xs bg-transparent border rounded px-1 py-0.5 max-w-[100px]"
                      >
                        <option value="">—</option>
                        {ggls.map((g) => <option key={g.id} value={g.id}>{g.unit_name}</option>)}
                      </select>
                    </td>
                    <td className="p-2"><button onClick={() => remove(r.cpf)} className="text-destructive hover:opacity-70"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuthorizedBase;
