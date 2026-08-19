import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileDown,
  Image as ImageIcon,
  Pencil,
  Save,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppHeader } from "@/components/AppHeader";
import { PaperRenderer, type PaperMeta } from "@/components/PaperRenderer";
import { supabase } from "@/integrations/supabase/client";
import { fileToDataUrl } from "@/lib/parse-file";
import { exportPaperDocx, exportPaperPdf } from "@/lib/export";
import { getPattern } from "@/lib/paper-pattern";
import { reframeQuestionFn } from "@/lib/reframe.functions";
import type { GeneratedSet } from "@/lib/paper.functions";

export const Route = createFileRoute("/_authenticated/designer/paper/$id")({
  head: () => ({
    meta: [
      { title: "Edit Paper — Somaiya Portal" },
      {
        name: "description",
        content: "Review generated sets, attach diagrams, and send the paper to DQC.",
      },
    ],
  }),
  component: () => (
    <RoleGuard role="designer">
      <PaperEditor />
    </RoleGuard>
  ),
});

function PaperEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [paper, setPaper] = useState<any>(null);
  const [diagrams, setDiagrams] = useState<any[]>([]);
  const [activeSetIdx, setActiveSetIdx] = useState(0);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachKey, setAttachKey] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedSets, setEditedSets] = useState<GeneratedSet[] | null>(null);
  const [editedMeta, setEditedMeta] = useState<PaperMeta | null>(null);
  const [reframeOpen, setReframeOpen] = useState(false);
  const [reframeKey, setReframeKey] = useState("");
  const [reframeText, setReframeText] = useState("");
  const [reframing, setReframing] = useState(false);
  const [reframeErr, setReframeErr] = useState("");

  const load = async () => {
    const { data } = await supabase.from("papers").select("*").eq("id", id).maybeSingle();
    setPaper(data);
    if (data?.selected_set_index != null) setActiveSetIdx(data.selected_set_index);
    const { data: d } = await supabase.from("diagrams").select("*").eq("paper_id", id);
    setDiagrams(d || []);
  };

  useEffect(() => {
    load();
  }, [id]);

  const diagramMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const d of diagrams) {
      if (d.set_index === activeSetIdx) m[d.question_key] = d.image_url;
    }
    return m;
  }, [diagrams, activeSetIdx]);

  if (!paper)
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="p-6 text-muted-foreground">Loading…</div>
      </div>
    );

  const meta: PaperMeta = editedMeta ?? paper.meta;
  const sets: GeneratedSet[] = editedSets ?? paper.sets ?? [];
  const pattern = getPattern(meta.marks);
  const readOnly = paper.status !== "draft" && paper.status !== "not_approved";
  const selectedIdx = paper.selected_set_index;

  const applyEdit = (key: string, text: string) => {
    setEditedSets((prev) => {
      const base: GeneratedSet[] = prev ?? JSON.parse(JSON.stringify(paper.sets ?? []));
      const s = base[activeSetIdx];
      if (!s) return base;
      const q = s.questions.find((x) => x.key === key);
      if (q) q.text = text;
      return [...base];
    });
  };

  const applyEditCO = (coKey: string, text: string) => {
    setEditedMeta((prev) => {
      const base: PaperMeta = prev ?? JSON.parse(JSON.stringify(paper.meta ?? {}));
      const cos = { ...(base.courseOutcomes ?? {}) };
      cos[coKey] = text;
      return { ...base, courseOutcomes: cos };
    });
  };

  const saveEdits = async () => {
    if (!editedSets && !editedMeta) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const updatePayload: any = {};
    if (editedSets) updatePayload.sets = editedSets;
    if (editedMeta) updatePayload.meta = editedMeta;
    await supabase.from("papers").update(updatePayload).eq("id", id);
    setSaving(false);
    setEditing(false);
    setEditedSets(null);
    setEditedMeta(null);
    await load();
  };

  const cancelEdits = () => {
    setEditedSets(null);
    setEditedMeta(null);
    setEditing(false);
  };

  const runReframe = async () => {
    const q = sets[activeSetIdx]?.questions.find((x) => x.key === reframeKey);
    if (!q) return;
    setReframing(true);
    setReframeErr("");
    try {
      const res = await reframeQuestionFn({
        data: { text: q.text, bloom: q.bloom, marks: q.marks, courseName: meta.courseName },
      });
      setReframeText(res.text);
    } catch (e: any) {
      setReframeErr(e?.message ?? "Could not reframe this question.");
    } finally {
      setReframing(false);
    }
  };

  const saveReframe = async () => {
    if (!reframeKey || !reframeText.trim()) return;
    const base: GeneratedSet[] = JSON.parse(JSON.stringify(editedSets ?? paper.sets ?? []));
    const q = base[activeSetIdx]?.questions.find((x) => x.key === reframeKey);
    if (!q) return;
    q.text = reframeText.trim();
    setSaving(true);
    await supabase.from("papers").update({ sets: base }).eq("id", id);
    setSaving(false);
    setEditedSets(null);
    setReframeOpen(false);
    setReframeKey("");
    setReframeText("");
    await load();
  };

  const finalizeSet = async (idx: number) => {
    setSaving(true);
    await supabase.from("papers").update({ selected_set_index: idx }).eq("id", id);
    setSaving(false);
    await load();
  };

  const sendToDqc = async () => {
    if (selectedIdx == null) return alert("Please finalize a set first.");
    setSaving(true);
    await supabase.from("papers").update({ status: "sent_to_dqc" }).eq("id", id);
    await supabase.from("notifications").insert({
      recipient_email: "dqc@somaiya.edu",
      paper_id: id,
      message: `New paper for review: ${meta.courseName} (${meta.courseCode})`,
    });
    setSaving(false);
    navigate({ to: "/designer", search: { tab: "sent_to_dqc" } });
  };

  const uploadDiagram = async (file: File) => {
    const url = await fileToDataUrl(file);
    await supabase
      .from("diagrams")
      .upsert(
        { paper_id: id, set_index: activeSetIdx, question_key: attachKey, image_url: url },
        { onConflict: "paper_id,set_index,question_key" as any },
      );
    // Since we don't have a unique constraint, delete existing then insert
    await supabase
      .from("diagrams")
      .delete()
      .eq("paper_id", id)
      .eq("set_index", activeSetIdx)
      .eq("question_key", attachKey);
    await supabase
      .from("diagrams")
      .insert({ paper_id: id, set_index: activeSetIdx, question_key: attachKey, image_url: url });
    setAttachOpen(false);
    setAttachKey("");
    await load();
  };

  const activeSet = sets[activeSetIdx];
  const setLabels = ["Easy Set", "Medium Set", "Hard Set"];

  const doExport = async (kind: "pdf" | "docx") => {
    const set = sets[selectedIdx ?? activeSetIdx];
    const dm: Record<string, string> = {};
    for (const d of diagrams)
      if (d.set_index === (selectedIdx ?? activeSetIdx)) dm[d.question_key] = d.image_url;
    const fname = `${meta.courseCode}_${meta.marks}marks.${kind}`;
    if (kind === "pdf") await exportPaperPdf(meta, set, dm, paper.dqc_signature_url, fname);
    else await exportPaperDocx(meta, set, dm, paper.dqc_signature_url, fname);
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">
              {meta.courseName} ({meta.courseCode})
            </h1>
            <p className="text-sm text-muted-foreground">
              {meta.marks} marks · {meta.className} Sem {meta.semester} · Status:{" "}
              <span className="font-medium">{paper.status.replace(/_/g, " ")}</span>
            </p>
            {paper.status === "not_approved" && paper.dqc_note && (
              <div className="mt-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <b>DQC feedback:</b> {paper.dqc_note}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {selectedIdx != null && (
              <>
                <button
                  onClick={() => doExport("pdf")}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm hover:bg-accent"
                >
                  <FileDown className="w-4 h-4" /> PDF
                </button>
                <button
                  onClick={() => doExport("docx")}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm hover:bg-accent"
                >
                  <Download className="w-4 h-4" /> Word
                </button>
              </>
            )}
            {!readOnly && (
              <button
                onClick={sendToDqc}
                disabled={selectedIdx == null || saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-md text-sm font-medium hover:bg-brand/90 transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> Send to DQC
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {sets.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSetIdx(i)}
              className={`px-4 py-2 rounded-md text-sm transition ${
                activeSetIdx === i
                  ? "bg-brand text-brand-foreground"
                  : "bg-card border border-border hover:bg-accent"
              }`}
            >
              {setLabels[i]}
              {selectedIdx === i && <CheckCircle2 className="w-4 h-4 inline ml-2" />}
            </button>
          ))}
        </div>

        {!readOnly && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => finalizeSet(activeSetIdx)}
              disabled={selectedIdx === activeSetIdx || saving || editing}
              className="inline-flex items-center gap-2 px-4 py-2 border border-brand text-brand rounded-md text-sm hover:bg-brand-muted transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />{" "}
              {selectedIdx === activeSetIdx ? "This is the selected set" : "Finalize this set"}
            </button>
            <button
              onClick={() => setAttachOpen(true)}
              disabled={editing}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm hover:bg-accent disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4" /> Add Diagram
            </button>
            <button
              onClick={() => {
                setReframeErr("");
                setReframeText("");
                setReframeKey("");
                setReframeOpen(true);
              }}
              disabled={editing}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm hover:bg-accent disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" /> Reframe Question
            </button>

            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm hover:bg-accent"
              >
                <Pencil className="w-4 h-4" /> Edit Question Paper
              </button>
            ) : (
              <>
                <button
                  onClick={saveEdits}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-md text-sm font-medium hover:bg-brand/90 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Edits"}
                </button>
                <button
                  onClick={cancelEdits}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm hover:bg-accent"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <span className="self-center text-xs text-muted-foreground">
                  Click any question text or Course Outcome to edit in-place. Save to persist.
                </span>
              </>
            )}
          </div>
        )}

        <PaperRenderer
          meta={meta}
          set={activeSet}
          diagrams={diagramMap}
          showAttachHint={!readOnly && !editing}
          setLabel={`${setLabels[activeSetIdx]}${selectedIdx === activeSetIdx ? " · Selected" : ""}${editing ? " · Editing" : ""}`}
          onAttachClick={(k) => {
            setAttachKey(k);
            setAttachOpen(true);
          }}
          editable={editing}
          onEditQuestion={applyEdit}
          onEditCO={applyEditCO}
        />
      </div>

      {attachOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Attach diagram</h3>
              <button
                onClick={() => setAttachOpen(false)}
                aria-label="Close"
                className="p-1 hover:bg-accent rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="text-sm block">Question</label>
              <select
                value={attachKey}
                onChange={(e) => setAttachKey(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
              >
                <option value="">Select question…</option>
                {pattern.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.key}
                  </option>
                ))}
              </select>
              <label className="text-sm block">Image</label>
              <input
                type="file"
                accept="image/*"
                disabled={!attachKey}
                onChange={(e) => e.target.files?.[0] && uploadDiagram(e.target.files[0])}
                className="w-full text-sm"
              />
              <p className="text-xs text-muted-foreground">
                The image will render directly below the selected question.
              </p>
            </div>
          </div>
        </div>
      )}

      {reframeOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Reframe question</h3>
              <button
                onClick={() => setReframeOpen(false)}
                aria-label="Close reframe dialog"
                className="p-1 hover:bg-accent rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="text-sm block">Question</label>
              <select
                value={reframeKey}
                onChange={(e) => {
                  setReframeKey(e.target.value);
                  setReframeText("");
                  setReframeErr("");
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
              >
                <option value="">Select question…</option>
                {(sets[activeSetIdx]?.questions ?? []).map((q) => (
                  <option key={q.key} value={q.key}>
                    {q.key}) · {q.bloom} · {q.marks}m
                  </option>
                ))}
              </select>

              {reframeKey && (
                <div className="text-sm p-3 rounded-md bg-muted/50 border border-border">
                  <span className="font-medium">Current: </span>
                  {sets[activeSetIdx]?.questions.find((x) => x.key === reframeKey)?.text ?? "—"}
                </div>
              )}

              <button
                onClick={runReframe}
                disabled={!reframeKey || reframing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-md text-sm font-medium hover:bg-brand/90 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" /> {reframing ? "Reframing…" : "Reframe"}
              </button>

              {reframeErr && <p className="text-sm text-destructive">{reframeErr}</p>}

              {reframeText && (
                <>
                  <textarea
                    value={reframeText}
                    onChange={(e) => setReframeText(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                  />
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={saveReframe}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-md text-sm font-medium hover:bg-brand/90 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" /> {saving ? "Saving…" : "Apply to paper"}
                    </button>
                    <button
                      onClick={runReframe}
                      disabled={reframing}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm hover:bg-accent disabled:opacity-50"
                    >
                      {reframing ? "Reframing…" : "Try again"}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The question is twisted only using Bloom's Taxonomy action verbs for its level.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
