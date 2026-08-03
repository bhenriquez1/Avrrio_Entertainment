"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { FieldGroup, Input, Textarea } from "@/components/ui/Field";
import { PersonalStatementWizard } from "@/components/essays/PersonalStatementWizard";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { usePersonalStatements } from "@/lib/essays/hooks";
import { logClientEvent } from "@/lib/audit/client";
import { downloadMarkdown } from "@/lib/recommendations/documents";

type Mode = "choose" | "guided" | "simple";

export default function EssayStudioPage() {
  const { getIdToken } = useAuth();
  const { statements, loading, error, upsert } = usePersonalStatements();

  const [mode, setMode] = useState<Mode>("choose");

  // Simple mode state
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleSimpleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    setSavedMessage(null);
    try {
      const idToken = await getIdToken();
      const response = await fetch("/api/essays/draft-statement", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ mode: "simple", topic, notes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to generate draft");
      setContent(data.content as string);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Failed to generate draft");
    } finally {
      setGenerating(false);
    }
  };

  const handleSimpleSave = async () => {
    setSaving(true);
    setGenError(null);
    try {
      await upsert({ topic, content });
      await logClientEvent(getIdToken, "save_personal_statement");
      setSavedMessage("Saved.");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSimpleExport = () => {
    downloadMarkdown(
      "personal-statement.md",
      `# Personal Statement\n\n${topic ? `**Topic:** ${topic}\n\n` : ""}${content}`
    );
    void logClientEvent(getIdToken, "export_personal_statement");
  };

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      {mode === "choose" && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Personal Statement & Essay Studio
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Choose how you want to build your personal statement.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("guided")}
              className="rounded-xl border border-zinc-200 bg-white p-5 text-left transition hover:border-zinc-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
            >
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Guided Writer (Recommended)
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Walk through 7 steps: voice capture, quality selection, experience bank, theme,
                outline, drafting, and reapplicant comparison. Build a genuine, story-driven
                statement with your authentic voice.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("simple")}
              className="rounded-xl border border-zinc-200 bg-white p-5 text-left transition hover:border-zinc-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
            >
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Quick Draft</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Have notes or a prompt ready? Generate a draft directly from a topic and your
                brainstorming notes.
              </p>
            </button>
          </div>
        </Card>
      )}

      {/* Guided mode */}
      {mode === "guided" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Guided Personal Statement Writer
            </h2>
            <button
              onClick={() => setMode("choose")}
              className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
            >
              ← Back
            </button>
          </div>
          <PersonalStatementWizard
            onSave={async (topic, content) => {
              await upsert({ topic, content });
            }}
          />
        </div>
      )}

      {/* Simple mode */}
      {mode === "simple" && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Quick Draft
            </h2>
            <button
              onClick={() => setMode("choose")}
              className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
            >
              ← Back
            </button>
          </div>
          <FieldGroup label="Topic or prompt">
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </FieldGroup>
          <FieldGroup label="Brainstorming notes (experiences, anecdotes, themes)">
            <Textarea
              className="min-h-32"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </FieldGroup>
          <Button onClick={handleSimpleGenerate} loading={generating} disabled={!topic.trim()}>
            Generate Draft
          </Button>
          {genError && <ErrorMessage message={genError} />}
          {content && (
            <div className="space-y-3">
              <FieldGroup label="Draft (editable)">
                <Textarea
                  className="min-h-64"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </FieldGroup>
              <div className="flex items-center gap-3">
                <Button onClick={handleSimpleSave} loading={saving} variant="secondary">
                  Save Draft
                </Button>
                <Button onClick={handleSimpleExport} variant="ghost">
                  Export
                </Button>
                {savedMessage && (
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">
                    {savedMessage}
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Saved Drafts */}
      <Card>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Saved Drafts</h2>
        {error && <ErrorMessage message={error} />}
        {loading ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : statements.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No saved drafts yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {statements.map((s) => (
              <li key={s.id} className="text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-medium">{s.topic || "Untitled"}</span>{" "}
                <span className="text-zinc-400 dark:text-zinc-500">
                  — updated {new Date(s.updatedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
