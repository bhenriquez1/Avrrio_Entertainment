"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { FieldGroup, Select, Textarea } from "@/components/ui/Field";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { logClientEvent } from "@/lib/audit/client";
import { downloadMarkdown } from "@/lib/recommendations/documents";
import type { GuidedPersonalStatementInput, PersonalStatementRefineAction } from "@/lib/ai/prompts";
import {
  ATTRIBUTE_LABELS,
  CORE_ATTRIBUTES,
  EXPERIENCE_CATEGORY_LABELS,
  PERSONAL_STATEMENT_THEME_LABELS,
  type CoreAttribute,
  type ExperienceCategory,
  type PersonalStatementExperience,
  type PersonalStatementOutline,
  type PersonalStatementQualityEntry,
  type PersonalStatementTheme,
  type PersonalStatementVoice,
} from "@/types/recommendation";

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEP_LABELS: Record<WizardStep, string> = {
  1: "Your Voice",
  2: "Qualities",
  3: "Experiences",
  4: "Theme",
  5: "Outline",
  6: "Draft & Refine",
  7: "Reapplicant",
};

const EXPERIENCE_CATEGORIES = Object.entries(EXPERIENCE_CATEGORY_LABELS) as [
  ExperienceCategory,
  string,
][];

const THEMES = Object.entries(PERSONAL_STATEMENT_THEME_LABELS) as [PersonalStatementTheme, string][];

const REFINE_OPTIONS: { action: PersonalStatementRefineAction; label: string }[] = [
  { action: "improve_grammar", label: "Improve Grammar" },
  { action: "more_reflective", label: "Make More Reflective" },
  { action: "add_specific_detail", label: "Add Specific Detail" },
  { action: "reduce_repetition", label: "Reduce Repetition" },
  { action: "strengthen_opening", label: "Strengthen Opening" },
  { action: "strengthen_conclusion", label: "Strengthen Conclusion" },
  { action: "check_authenticity", label: "Check Authenticity" },
];

const emptyVoice: PersonalStatementVoice = {
  whyThisProfession: "",
  mostInfluentialExperience: "",
  whatKindOfProfessional: "",
  whatCommitteeShouldKnow: "",
};

function emptyExperience(): PersonalStatementExperience {
  return {
    id: crypto.randomUUID(),
    category: "clinical",
    whatHappened: "",
    myRole: "",
    thoughtFeeling: "",
    whatILearned: "",
    howItChangedMe: "",
    howItInfluencedGoal: "",
  };
}

const emptyOutline: PersonalStatementOutline = {
  openingStory: "",
  motivation: "",
  development: "",
  growth: "",
  whyThisProfession: "",
  futureContribution: "",
  conclusion: "",
};

function StepIndicator({ current, total }: { current: WizardStep; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (i + 1) as WizardStep).map((step) => (
        <div
          key={step}
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition ${
            step === current
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : step < current
                ? "bg-zinc-300 text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200"
                : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
          }`}
        >
          {step}
        </div>
      ))}
      <span className="ml-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {STEP_LABELS[current]}
      </span>
    </div>
  );
}

export function PersonalStatementWizard({
  onSave,
}: {
  onSave: (topic: string, content: string) => Promise<void>;
}) {
  const { getIdToken } = useAuth();
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1 — Voice
  const [voice, setVoice] = useState<PersonalStatementVoice>(emptyVoice);

  // Step 2 — Qualities
  const [selectedQualities, setSelectedQualities] = useState<Set<CoreAttribute>>(new Set());
  const [qualityExperiences, setQualityExperiences] = useState<
    Record<string, PersonalStatementQualityEntry>
  >({});

  // Step 3 — Experiences
  const [experiences, setExperiences] = useState<PersonalStatementExperience[]>([
    emptyExperience(),
  ]);

  // Step 4 — Theme
  const [centralTheme, setCentralTheme] = useState<PersonalStatementTheme>("personal_growth");
  const [programType, setProgramType] = useState("");
  const [applicantName, setApplicantName] = useState("");

  // Step 5 — Outline
  const [outline, setOutline] = useState<PersonalStatementOutline | null>(null);
  const [outlineRaw, setOutlineRaw] = useState("");
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [outlineApproved, setOutlineApproved] = useState(false);

  // Step 6 — Draft
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Step 7 — Reapplicant
  const [previousStatement, setPreviousStatement] = useState("");
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const buildGuidedInput = (): GuidedPersonalStatementInput => ({
    voice,
    qualities: Object.values(qualityExperiences).filter((q) => q.supportingExperience.trim()),
    experiences: experiences.filter((e) => e.whatHappened.trim()),
    centralTheme,
    outline: outline ?? undefined,
    applicantName: applicantName || undefined,
    programType: programType || undefined,
  });

  const callApi = async (body: Record<string, unknown>): Promise<string> => {
    const idToken = await getIdToken();
    const response = await fetch("/api/essays/draft-statement", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Request failed");
    return data.content as string;
  };

  const handleGenerateOutline = async () => {
    setGeneratingOutline(true);
    setError(null);
    try {
      const raw = await callApi({ mode: "outline", guidedInput: buildGuidedInput() });
      setOutlineRaw(raw);
      setOutline({ ...emptyOutline });
      setOutlineApproved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate outline");
    } finally {
      setGeneratingOutline(false);
    }
  };

  const handleGenerateDraft = async () => {
    setGenerating(true);
    setError(null);
    setSavedMessage(null);
    try {
      const result = await callApi({ mode: "guided", guidedInput: buildGuidedInput() });
      setContent(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate draft");
    } finally {
      setGenerating(false);
    }
  };

  const handleRefine = async (action: PersonalStatementRefineAction, label: string) => {
    setRefining(label);
    setError(null);
    setSavedMessage(null);
    try {
      const result = await callApi({ mode: "refine", content, refineAction: action });
      setContent(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refine");
    } finally {
      setRefining(null);
    }
  };

  const handleCompare = async () => {
    setComparing(true);
    setError(null);
    try {
      const result = await callApi({
        mode: "compare",
        currentDraft: content,
        previousStatement,
      });
      setComparisonResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compare");
    } finally {
      setComparing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(programType || "Personal Statement", content);
      await logClientEvent(getIdToken, "save_personal_statement_guided");
      setSavedMessage("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    downloadMarkdown(
      "personal-statement.md",
      `# Personal Statement\n\n${programType ? `**Applying to:** ${programType}\n\n` : ""}${content}`
    );
    void logClientEvent(getIdToken, "export_personal_statement_guided");
  };

  const toggleQuality = (attr: CoreAttribute) => {
    setSelectedQualities((prev) => {
      const next = new Set(prev);
      if (next.has(attr)) {
        next.delete(attr);
      } else {
        next.add(attr);
        if (!qualityExperiences[attr]) {
          setQualityExperiences((qe) => ({
            ...qe,
            [attr]: { attribute: attr, supportingExperience: "" },
          }));
        }
      }
      return next;
    });
  };

  const updateQualityExperience = (attr: CoreAttribute, value: string) => {
    setQualityExperiences((prev) => ({
      ...prev,
      [attr]: { attribute: attr, supportingExperience: value },
    }));
  };

  const addExperience = () => setExperiences((prev) => [...prev, emptyExperience()]);

  const updateExperience = (
    id: string,
    field: keyof PersonalStatementExperience,
    value: string
  ) => {
    setExperiences((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const removeExperience = (id: string) =>
    setExperiences((prev) => prev.filter((e) => e.id !== id));

  return (
    <div className="space-y-6">
      <StepIndicator current={step} total={7} />

      {error && <ErrorMessage message={error} />}

      {/* Step 1: Voice */}
      {step === 1 && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Your Voice & Motivation
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Answer in your own words — 2 to 5 sentences each. Don&apos;t edit yet. Just write what
              you actually think and feel.
            </p>
          </div>
          <FieldGroup label="Why do you want to enter this profession? What drives you?">
            <Textarea
              value={voice.whyThisProfession}
              onChange={(e) => setVoice((v) => ({ ...v, whyThisProfession: e.target.value }))}
              placeholder="What is the real reason — not the admissions-polished version?"
            />
          </FieldGroup>
          <FieldGroup label="What was the most influential experience that shaped your path?">
            <Textarea
              value={voice.mostInfluentialExperience}
              onChange={(e) =>
                setVoice((v) => ({ ...v, mostInfluentialExperience: e.target.value }))
              }
              placeholder="A specific moment, person, or turning point that changed how you see this field."
            />
          </FieldGroup>
          <FieldGroup label="What kind of professional do you want to become?">
            <Textarea
              value={voice.whatKindOfProfessional}
              onChange={(e) =>
                setVoice((v) => ({ ...v, whatKindOfProfessional: e.target.value }))
              }
              placeholder="How do you want to practice? Who do you want to serve? What do you want to stand for?"
            />
          </FieldGroup>
          <FieldGroup label="What should the admissions committee know about you that your application doesn't already show?">
            <Textarea
              value={voice.whatCommitteeShouldKnow}
              onChange={(e) =>
                setVoice((v) => ({ ...v, whatCommitteeShouldKnow: e.target.value }))
              }
              placeholder="What makes you different? What context or story is missing from your numbers and resume?"
            />
          </FieldGroup>
          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={
                !voice.whyThisProfession.trim() || !voice.mostInfluentialExperience.trim()
              }
            >
              Next: Qualities →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Qualities */}
      {step === 2 && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Core Qualities
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Select the qualities that genuinely describe you and add a real experience or memory
              that demonstrates each one.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CORE_ATTRIBUTES.map((attr) => (
              <button
                key={attr}
                type="button"
                onClick={() => toggleQuality(attr)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  selectedQualities.has(attr)
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {ATTRIBUTE_LABELS[attr]}
              </button>
            ))}
          </div>
          {selectedQualities.size > 0 && (
            <div className="space-y-3">
              {Array.from(selectedQualities).map((attr) => (
                <FieldGroup
                  key={attr}
                  label={`${ATTRIBUTE_LABELS[attr]}: What real experience shows this?`}
                >
                  <Textarea
                    value={qualityExperiences[attr]?.supportingExperience ?? ""}
                    onChange={(e) => updateQualityExperience(attr, e.target.value)}
                    placeholder="Describe a specific moment, situation, or example that demonstrates this quality."
                  />
                </FieldGroup>
              ))}
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={selectedQualities.size === 0}>
              Next: Experiences →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Experience Bank */}
      {step === 3 && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Experience Bank
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Add the experiences you want to draw from. Fill in what you can — more detail
              produces a better draft.
            </p>
          </div>
          {experiences.map((exp, idx) => (
            <div
              key={exp.id}
              className="rounded-lg border border-zinc-200 p-4 space-y-3 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Experience {idx + 1}
                </h3>
                {experiences.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExperience(exp.id)}
                    className="text-xs text-red-600 hover:underline dark:text-red-400"
                  >
                    Remove
                  </button>
                )}
              </div>
              <FieldGroup label="Category">
                <Select
                  value={exp.category}
                  onChange={(e) =>
                    updateExperience(exp.id, "category", e.target.value as ExperienceCategory)
                  }
                >
                  {EXPERIENCE_CATEGORIES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup label="What happened?">
                <Textarea
                  value={exp.whatHappened}
                  onChange={(e) => updateExperience(exp.id, "whatHappened", e.target.value)}
                  placeholder="Describe the situation or experience briefly."
                />
              </FieldGroup>
              <FieldGroup label="What was your role?">
                <Textarea
                  value={exp.myRole}
                  onChange={(e) => updateExperience(exp.id, "myRole", e.target.value)}
                  placeholder="What did you actually do?"
                />
              </FieldGroup>
              <FieldGroup label="What did you think or feel in the moment?">
                <Textarea
                  value={exp.thoughtFeeling}
                  onChange={(e) => updateExperience(exp.id, "thoughtFeeling", e.target.value)}
                  placeholder="Be honest — uncertainty, doubt, excitement, discomfort all count."
                />
              </FieldGroup>
              <FieldGroup label="What did you learn?">
                <Textarea
                  value={exp.whatILearned}
                  onChange={(e) => updateExperience(exp.id, "whatILearned", e.target.value)}
                  placeholder="A skill, an insight, or a belief that shifted."
                />
              </FieldGroup>
              <FieldGroup label="How did it change how you think or who you are?">
                <Textarea
                  value={exp.howItChangedMe}
                  onChange={(e) => updateExperience(exp.id, "howItChangedMe", e.target.value)}
                  placeholder="What is different about you because of this?"
                />
              </FieldGroup>
              <FieldGroup label="How did it influence your professional goal?">
                <Textarea
                  value={exp.howItInfluencedGoal}
                  onChange={(e) =>
                    updateExperience(exp.id, "howItInfluencedGoal", e.target.value)
                  }
                  placeholder="How does this experience connect to why you want to enter this field?"
                />
              </FieldGroup>
            </div>
          ))}
          <Button variant="secondary" onClick={addExperience}>
            + Add Another Experience
          </Button>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>
              ← Back
            </Button>
            <Button
              onClick={() => setStep(4)}
              disabled={!experiences.some((e) => e.whatHappened.trim())}
            >
              Next: Theme →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Theme */}
      {step === 4 && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Central Theme
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Choose the theme that best unifies your story. The AI will thread this through your
              entire statement.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {THEMES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setCentralTheme(value)}
                className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
                  centralTheme === value
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <FieldGroup label="Your name (optional)">
            <input
              type="text"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              placeholder="First name or full name"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </FieldGroup>
          <FieldGroup label="Program or school type you're applying to">
            <input
              type="text"
              value={programType}
              onChange={(e) => setProgramType(e.target.value)}
              placeholder="e.g. Dental School, Medical School, Graduate Program..."
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </FieldGroup>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(3)}>
              ← Back
            </Button>
            <Button onClick={() => setStep(5)}>
              Next: Outline →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 5: Outline */}
      {step === 5 && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Outline</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Generate an outline first and approve it before the full draft. This gives you
              control over the structure before AI writes the essay.
            </p>
          </div>
          {!outlineRaw && (
            <Button onClick={handleGenerateOutline} loading={generatingOutline}>
              Generate Outline
            </Button>
          )}
          {outlineRaw && (
            <>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
                <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Generated Outline
                </h3>
                <Textarea
                  className="min-h-48"
                  value={outlineRaw}
                  onChange={(e) => setOutlineRaw(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={handleGenerateOutline}
                  loading={generatingOutline}
                >
                  Regenerate Outline
                </Button>
                <Button
                  onClick={() => {
                    setOutlineApproved(true);
                    setOutline({
                      openingStory: outlineRaw,
                      motivation: "",
                      development: "",
                      growth: "",
                      whyThisProfession: "",
                      futureContribution: "",
                      conclusion: "",
                    });
                    setStep(6);
                  }}
                >
                  Approve Outline & Continue →
                </Button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Edit the outline above if needed, then approve to proceed.
              </p>
            </>
          )}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(4)}>
              ← Back
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setOutlineApproved(false);
                setStep(6);
              }}
            >
              Skip Outline & Draft Directly
            </Button>
          </div>
        </Card>
      )}

      {/* Step 6: Draft & Refine */}
      {step === 6 && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Draft & Refine
            </h2>
            {outlineApproved && (
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                Outline approved — draft will follow your approved structure.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerateDraft} loading={generating}>
              {content ? "Regenerate Draft" : "Generate First Draft"}
            </Button>
          </div>
          {content && (
            <>
              <FieldGroup label="Personal Statement (editable)">
                <Textarea
                  className="min-h-96"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </FieldGroup>
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Refine tools:
                </p>
                <div className="flex flex-wrap gap-2">
                  {REFINE_OPTIONS.map(({ action, label }) => (
                    <Button
                      key={action}
                      variant="secondary"
                      onClick={() => handleRefine(action, label)}
                      loading={refining === label}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleSave} loading={saving}>
                  Save Draft
                </Button>
                <Button variant="ghost" onClick={handleExport}>
                  Export as Markdown
                </Button>
                <Button variant="secondary" onClick={() => setStep(7)}>
                  Reapplicant Comparison →
                </Button>
                {savedMessage && (
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">
                    {savedMessage}
                  </span>
                )}
              </div>
            </>
          )}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(5)}>
              ← Back
            </Button>
          </div>
        </Card>
      )}

      {/* Step 7: Reapplicant */}
      {step === 7 && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Reapplicant Comparison
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              If you&apos;re reapplying, paste your previous personal statement below. The AI will
              identify repeated stories, generic language, missing growth, and new experiences not
              yet included.
            </p>
          </div>
          {!content && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Go back to Step 6 and generate a draft first before comparing.
            </p>
          )}
          <FieldGroup label="Previous personal statement (paste here)">
            <Textarea
              className="min-h-64"
              value={previousStatement}
              onChange={(e) => setPreviousStatement(e.target.value)}
              placeholder="Paste your previous cycle's personal statement here..."
            />
          </FieldGroup>
          {content && previousStatement.trim() && (
            <Button onClick={handleCompare} loading={comparing}>
              Compare With Previous Cycle
            </Button>
          )}
          {comparisonResult && (
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
              <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Comparison Analysis
              </h3>
              <ComparisonDisplay result={comparisonResult} />
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(6)}>
              ← Back to Draft
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

type ComparisonData = {
  repeatedStories?: string[];
  genericLanguage?: string[];
  missingGrowth?: string[];
  newExperiencesNotUsed?: string[];
  weakExplanations?: string[];
  improvements?: string[];
  overallAssessment?: string;
};

function parseComparisonResult(result: string): ComparisonData | null {
  try {
    return JSON.parse(result) as ComparisonData;
  } catch {
    return null;
  }
}

function ComparisonDisplay({ result }: { result: string }) {
  const parsed = parseComparisonResult(result);

  if (!parsed) {
    return (
      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{result}</p>
    );
  }

  const sections = [
    { label: "Repeated Stories", items: parsed.repeatedStories },
    { label: "Generic Language", items: parsed.genericLanguage },
    { label: "Missing Evidence of Growth", items: parsed.missingGrowth },
    { label: "New Experiences Not Yet Used", items: parsed.newExperiencesNotUsed },
    { label: "Weak Explanations", items: parsed.weakExplanations },
    { label: "Suggested Improvements", items: parsed.improvements },
  ];

  return (
    <div className="space-y-3">
      {parsed.overallAssessment && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          <strong>Overall:</strong> {parsed.overallAssessment}
        </p>
      )}
      {sections.map(
        ({ label, items }) =>
          items && items.length > 0 && (
            <div key={label}>
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{label}:</p>
              <ul className="mt-1 list-inside list-disc space-y-1">
                {items.map((item, i) => (
                  <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )
      )}
    </div>
  );
}
