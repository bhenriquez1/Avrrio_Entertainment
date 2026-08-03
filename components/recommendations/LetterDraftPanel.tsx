"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/Field";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { saveLetterDraft } from "@/lib/recommendations/repository";
import { logClientEvent } from "@/lib/audit/client";
import { downloadMarkdown } from "@/lib/recommendations/documents";
import {
  LETTER_TYPE_LABELS,
  PERSPECTIVE_QUESTIONS,
  RECOMMENDATION_STRENGTH_LABELS,
  type ApplicantDraftAnswers,
  type ApplicantProfile,
  type DraftApprovalStatus,
  type DraftAuthor,
  type GuidedLetterAnswers,
  type LetterType,
  type RecommendationStrength,
  type Recommender,
} from "@/types/recommendation";

const LETTER_TYPES = Object.entries(LETTER_TYPE_LABELS) as [LetterType, string][];

type Mode = "choose" | "recommender_choose" | "notes" | "guided" | "applicant_draft";

const TONE_OPTIONS = ["formal", "warm", "clinical", "academic", "strong", "concise"];

const GUIDED_QUESTIONS: { key: keyof GuidedLetterAnswers; label: string; multiline?: boolean }[] = [
  { key: "applicantName", label: "Applicant's full name" },
  { key: "recommenderNameTitle", label: "Your name and title" },
  { key: "relationshipToApplicant", label: "Your relationship to the applicant" },
  { key: "howLongKnown", label: "How long have you known the applicant?" },
  { key: "settingKnown", label: "In what setting do you know them? (class, clinic, work, lab...)" },
  { key: "strongestQualities", label: "What are the applicant's strongest qualities?", multiline: true },
  { key: "realExampleOrMemory", label: "Share a real example or specific memory that shows this", multiline: true },
  { key: "whyRecommend", label: "Why do you recommend this applicant?", multiline: true },
  { key: "programSchoolType", label: "What program or school type is this for?" },
];

const emptyGuidedAnswers: GuidedLetterAnswers = {
  applicantName: "",
  recommenderNameTitle: "",
  relationshipToApplicant: "",
  howLongKnown: "",
  settingKnown: "",
  strongestQualities: "",
  realExampleOrMemory: "",
  whyRecommend: "",
  programSchoolType: "",
  desiredTone: "formal",
};

const APPROVAL_STATUS_LABELS: Record<DraftApprovalStatus, string> = {
  drafted: "Drafted by Applicant",
  pending_review: "Pending Recommender Review",
  approved: "Approved by Recommender",
};

const REVIEW_HEADER =
  "[DRAFT — FOR RECOMMENDER REVIEW]\nThis letter was prepared at your request. Please read carefully, edit as needed to reflect your own voice and observations, and submit only when you are satisfied it accurately represents your views.\n\n";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mt-6 mb-2 border-b border-zinc-200 pb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
      {children}
    </h4>
  );
}

export function LetterDraftPanel({
  uid,
  recommender,
  applicantProfile,
}: {
  uid: string;
  recommender: Recommender;
  applicantProfile: ApplicantProfile;
}) {
  const [letterType, setLetterType] = useState<LetterType>("dental_school");
  const [strength, setStrength] = useState<RecommendationStrength>("strongly_supportive");
  const [content, setContent] = useState("");
  const [voiceMatchScore, setVoiceMatchScore] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const { getIdToken } = useAuth();

  const [mode, setMode] = useState<Mode>("choose");
  const [notes, setNotes] = useState("");
  const [generatedBy, setGeneratedBy] = useState<DraftAuthor>("recommender");
  const [approvalStatus, setApprovalStatus] = useState<DraftApprovalStatus>("drafted");

  const [guidedAnswers, setGuidedAnswers] = useState<GuidedLetterAnswers>({
    ...emptyGuidedAnswers,
    applicantName: applicantProfile.applicantName || "",
    recommenderNameTitle: recommender.name ? `${recommender.name}, ${recommender.role}` : "",
    relationshipToApplicant: recommender.relationshipToApplicant || "",
  });

  const perspectiveQuestions = PERSPECTIVE_QUESTIONS[recommender.recommenderType] ?? [];

  const [applicantDraftAnswers, setApplicantDraftAnswers] = useState<ApplicantDraftAnswers>({
    applicantFullName: applicantProfile.applicantName || "",
    programType: "",
    schoolsOrApplicationType: "",
    careerGoal: "",
    personalQualities: "",
    achievements: "",
    recommenderFullName: recommender.name || "",
    recommenderTitle: recommender.role || "",
    recommenderInstitution: recommender.institution || "",
    relationshipToApplicant: recommender.relationshipToApplicant || "",
    howLongKnown: "",
    contextKnown: "",
    academicExamples: "",
    clinicalExamples: "",
    patientInteraction: "",
    workEthic: "",
    leadership: "",
    reliability: "",
    professionalism: "",
    growthOverTime: "",
    realStoriesObservations: "",
    voiceSentences: "",
    writingSample: "",
    perspectiveAnswers: Object.fromEntries(perspectiveQuestions.map((q) => [q.id, ""])),
  });

  const updateGuided = <K extends keyof GuidedLetterAnswers>(key: K, value: GuidedLetterAnswers[K]) =>
    setGuidedAnswers((prev) => ({ ...prev, [key]: value }));

  const updateApplicantDraft = <K extends keyof ApplicantDraftAnswers>(
    key: K,
    value: ApplicantDraftAnswers[K]
  ) => setApplicantDraftAnswers((prev) => ({ ...prev, [key]: value }));

  const updatePerspectiveAnswer = (questionId: string, value: string) =>
    setApplicantDraftAnswers((prev) => ({
      ...prev,
      perspectiveAnswers: { ...prev.perspectiveAnswers, [questionId]: value },
    }));

  const generateDraft = async (body: Record<string, unknown>, author: DraftAuthor = "recommender") => {
    setGenerating(true);
    setError(null);
    setSavedMessage(null);
    try {
      const idToken = await getIdToken();
      const response = await fetch("/api/recommendations/draft-letter", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to generate letter draft");
      setContent(data.content);
      setVoiceMatchScore(data.voiceMatchScore ?? null);
      setGeneratedBy(author);
      setApprovalStatus("drafted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate letter draft");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateFromProfile = () =>
    generateDraft({
      mode: "profile",
      recommender,
      letterType,
      applicantProfile,
      applicantName: applicantProfile.applicantName || "the applicant",
    });

  const handleImproveNotes = () =>
    generateDraft({
      mode: "notes",
      recommender,
      letterType,
      applicantProfile,
      applicantName: applicantProfile.applicantName || "the applicant",
      notes,
    });

  const handleGenerateFromGuided = () =>
    generateDraft({
      mode: "guided",
      recommender,
      letterType,
      applicantProfile,
      applicantName: guidedAnswers.applicantName || applicantProfile.applicantName || "the applicant",
      guidedAnswers,
    });

  const handleGenerateApplicantDraft = () =>
    generateDraft(
      {
        mode: "applicant_draft",
        recommender,
        letterType,
        applicantProfile,
        applicantName: applicantDraftAnswers.applicantFullName || applicantProfile.applicantName || "the applicant",
        applicantDraftAnswers,
      },
      "applicant"
    );

  const handleRefine = async (action: string, label: string) => {
    setRefining(label);
    setError(null);
    setSavedMessage(null);
    try {
      const idToken = await getIdToken();
      const response = await fetch("/api/recommendations/refine-letter", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ content, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to refine letter");
      setContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refine letter");
    } finally {
      setRefining(null);
    }
  };

  const handleAddReviewHeader = () => {
    if (!content.startsWith("[DRAFT")) setContent(REVIEW_HEADER + content);
    setApprovalStatus("pending_review");
  };

  const handleRemoveReviewHeader = () => {
    setContent((c) => (c.startsWith("[DRAFT") ? c.replace(REVIEW_HEADER, "") : c));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveLetterDraft(uid, {
        recommenderId: recommender.id,
        letterType,
        content,
        voiceMatchScore,
        draftedBy: generatedBy,
        approvalStatus: generatedBy === "applicant" ? approvalStatus : undefined,
      });
      await logClientEvent(getIdToken, "save_letter_draft", { recommenderId: recommender.id });
      setSavedMessage("Draft saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustStrength = async (targetStrength: RecommendationStrength) => {
    const label = `strength_${targetStrength}`;
    setRefining(label);
    setError(null);
    setSavedMessage(null);
    try {
      const idToken = await getIdToken();
      const response = await fetch("/api/recommendations/refine-letter", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ content, action: "strength", strength: targetStrength }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to adjust strength");
      setContent(data.content);
      setStrength(targetStrength);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adjust strength");
    } finally {
      setRefining(null);
    }
  };

  const handleExport = () => {
    const filename = `${recommender.name.replace(/\s+/g, "-").toLowerCase() || "letter"}-recommendation.md`;
    downloadMarkdown(filename, `# Letter of Recommendation\n\nFor: ${applicantProfile.applicantName || "Applicant"}\nFrom: ${recommender.name}, ${recommender.role}\n\n${content}`);
    void logClientEvent(getIdToken, "export_letter_draft", { recommenderId: recommender.id });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldGroup label="Letter type">
          <Select value={letterType} onChange={(e) => setLetterType(e.target.value as LetterType)}>
            {LETTER_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup label="Recommendation strength">
          <Select
            value={strength}
            onChange={(e) => setStrength(e.target.value as RecommendationStrength)}
          >
            {(Object.entries(RECOMMENDATION_STRENGTH_LABELS) as [RecommendationStrength, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </Select>
        </FieldGroup>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* ── Top-level mode choice ── */}
      {mode === "choose" && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Who is writing this letter?</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={() => setMode("recommender_choose")}
              className="rounded-xl border border-zinc-200 bg-white p-5 text-left transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
            >
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">I&apos;m the recommender</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                I&apos;m the dentist, professor, employer, or mentor writing this letter myself.
              </p>
            </button>
            <button
              onClick={() => setMode("applicant_draft")}
              className="rounded-xl border border-zinc-200 bg-white p-5 text-left transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
            >
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                My recommender asked me to prepare a draft
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                I&apos;m the applicant. My recommender told me to write a draft for them to review and approve.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* ── Recommender workflow selection ── */}
      {mode === "recommender_choose" && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Already have voice and personality details filled in? Generate straight from that — or pick one of the options below for recommenders who are busy or don&apos;t know how to start.
            </p>
            <button
              onClick={() => setMode("choose")}
              className="shrink-0 text-xs text-zinc-500 hover:underline dark:text-zinc-400"
            >
              ← Back
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleGenerateFromProfile} loading={generating} variant="secondary">
              Generate Letter Draft (from voice &amp; personality)
            </Button>
            <Button onClick={() => setMode("notes")}>Improve Grammar but Keep My Voice</Button>
            <Button onClick={() => setMode("guided")}>Help Me Write This Letter</Button>
          </div>
        </div>
      )}

      {mode === "notes" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Write 2–5 sentences in your own words — we&apos;ll improve the grammar, keep your voice, and expand it into a complete letter.
            </h3>
            <button
              onClick={() => setMode("recommender_choose")}
              className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
            >
              ← Back
            </button>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Jordan was one of the most reliable students I've worked with in clinic. They picked up procedures quickly and always showed up prepared..."
          />
          <Button onClick={handleImproveNotes} loading={generating} disabled={!notes.trim()}>
            Improve Grammar but Keep My Voice
          </Button>
        </div>
      )}

      {mode === "guided" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Answer a few simple questions — we&apos;ll generate the full letter from your answers.
            </h3>
            <button
              onClick={() => setMode("recommender_choose")}
              className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
            >
              ← Back
            </button>
          </div>

          {GUIDED_QUESTIONS.map((q) => (
            <FieldGroup key={q.key} label={q.label}>
              {q.multiline ? (
                <Textarea value={guidedAnswers[q.key]} onChange={(e) => updateGuided(q.key, e.target.value)} />
              ) : (
                <Input value={guidedAnswers[q.key]} onChange={(e) => updateGuided(q.key, e.target.value)} />
              )}
            </FieldGroup>
          ))}

          <FieldGroup label="Desired tone">
            <Select value={guidedAnswers.desiredTone} onChange={(e) => updateGuided("desiredTone", e.target.value)}>
              {TONE_OPTIONS.map((tone) => (
                <option key={tone} value={tone}>
                  {tone.charAt(0).toUpperCase() + tone.slice(1)}
                </option>
              ))}
            </Select>
          </FieldGroup>

          <Button onClick={handleGenerateFromGuided} loading={generating}>
            Generate Full Letter From My Answers
          </Button>
        </div>
      )}

      {/* ── Applicant draft mode ── */}
      {mode === "applicant_draft" && (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Applicant Drafting for Recommender
              </p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                Use this mode only when your recommender has asked you to prepare a draft. The recommender must review, edit, approve, and submit the final letter.
              </p>
            </div>
            <button
              onClick={() => setMode("choose")}
              className="shrink-0 text-xs text-zinc-500 hover:underline dark:text-zinc-400"
            >
              ← Back
            </button>
          </div>

          <SectionHeading>Applicant Information</SectionHeading>
          <FieldGroup label="Applicant's full name">
            <Input
              value={applicantDraftAnswers.applicantFullName}
              onChange={(e) => updateApplicantDraft("applicantFullName", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Program type (e.g., Dental School, Medical School, Graduate Program)">
            <Input
              value={applicantDraftAnswers.programType}
              onChange={(e) => updateApplicantDraft("programType", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Schools or application type">
            <Input
              value={applicantDraftAnswers.schoolsOrApplicationType}
              onChange={(e) => updateApplicantDraft("schoolsOrApplicationType", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Career goal">
            <Textarea
              value={applicantDraftAnswers.careerGoal}
              onChange={(e) => updateApplicantDraft("careerGoal", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Personal qualities the recommender would highlight">
            <Textarea
              value={applicantDraftAnswers.personalQualities}
              onChange={(e) => updateApplicantDraft("personalQualities", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Relevant achievements, experiences, or accomplishments">
            <Textarea
              value={applicantDraftAnswers.achievements}
              onChange={(e) => updateApplicantDraft("achievements", e.target.value)}
            />
          </FieldGroup>

          <SectionHeading>Recommender Information</SectionHeading>
          <FieldGroup label="Recommender's full name">
            <Input
              value={applicantDraftAnswers.recommenderFullName}
              onChange={(e) => updateApplicantDraft("recommenderFullName", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Recommender's title">
            <Input
              value={applicantDraftAnswers.recommenderTitle}
              onChange={(e) => updateApplicantDraft("recommenderTitle", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Institution, clinic, or company">
            <Input
              value={applicantDraftAnswers.recommenderInstitution}
              onChange={(e) => updateApplicantDraft("recommenderInstitution", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Recommender's relationship to you">
            <Input
              value={applicantDraftAnswers.relationshipToApplicant}
              onChange={(e) => updateApplicantDraft("relationshipToApplicant", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="How long have they known you?">
            <Input
              value={applicantDraftAnswers.howLongKnown}
              onChange={(e) => updateApplicantDraft("howLongKnown", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Context or setting (class, clinic, research lab, workplace...)">
            <Input
              value={applicantDraftAnswers.contextKnown}
              onChange={(e) => updateApplicantDraft("contextKnown", e.target.value)}
            />
          </FieldGroup>

          <SectionHeading>Evidence &amp; Examples</SectionHeading>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Share specific things your recommender observed. Nothing will be invented — only what you provide here will appear in the letter.
          </p>
          <FieldGroup label="Academic examples (performance, discipline, intellectual curiosity)">
            <Textarea
              value={applicantDraftAnswers.academicExamples}
              onChange={(e) => updateApplicantDraft("academicExamples", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Clinical, lab, or field examples (procedures, research, hands-on work)">
            <Textarea
              value={applicantDraftAnswers.clinicalExamples}
              onChange={(e) => updateApplicantDraft("clinicalExamples", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Patient or client interaction">
            <Textarea
              value={applicantDraftAnswers.patientInteraction}
              onChange={(e) => updateApplicantDraft("patientInteraction", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Work ethic">
            <Textarea
              value={applicantDraftAnswers.workEthic}
              onChange={(e) => updateApplicantDraft("workEthic", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Leadership">
            <Textarea
              value={applicantDraftAnswers.leadership}
              onChange={(e) => updateApplicantDraft("leadership", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Reliability">
            <Textarea
              value={applicantDraftAnswers.reliability}
              onChange={(e) => updateApplicantDraft("reliability", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Professionalism">
            <Textarea
              value={applicantDraftAnswers.professionalism}
              onChange={(e) => updateApplicantDraft("professionalism", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Growth over time">
            <Textarea
              value={applicantDraftAnswers.growthOverTime}
              onChange={(e) => updateApplicantDraft("growthOverTime", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Real stories or specific observations (the more specific, the better)">
            <Textarea
              value={applicantDraftAnswers.realStoriesObservations}
              onChange={(e) => updateApplicantDraft("realStoriesObservations", e.target.value)}
            />
          </FieldGroup>

          {perspectiveQuestions.length > 0 && (
            <>
              <SectionHeading>
                Recommender&apos;s Perspective —{" "}
                {recommender.recommenderType.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </SectionHeading>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                What would your recommender say about each area? Share their specific observations or anything they mentioned to you directly.
              </p>
              {perspectiveQuestions.map((q) => (
                <FieldGroup key={q.id} label={q.question}>
                  <Textarea
                    value={applicantDraftAnswers.perspectiveAnswers[q.id] ?? ""}
                    onChange={(e) => updatePerspectiveAnswer(q.id, e.target.value)}
                  />
                </FieldGroup>
              ))}
            </>
          )}

          <SectionHeading>Recommender&apos;s Voice</SectionHeading>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Help us write in your recommender&apos;s natural voice. This keeps the draft sounding authentic rather than generic.
          </p>
          <FieldGroup label="Write 2–5 sentences the way your recommender talks or writes (use their phrasing if you can)">
            <Textarea
              value={applicantDraftAnswers.voiceSentences}
              onChange={(e) => updateApplicantDraft("voiceSentences", e.target.value)}
              placeholder={"e.g. \"She was one of the most prepared students I've worked with. Every time I walked into the clinic, she was already set up and ready to go...\""}

            />
          </FieldGroup>
          <FieldGroup label="Optional — paste a prior email, note, or evaluation from this recommender (only if they authorized you to use it)">
            <Textarea
              value={applicantDraftAnswers.writingSample}
              onChange={(e) => updateApplicantDraft("writingSample", e.target.value)}
            />
          </FieldGroup>

          <Button onClick={handleGenerateApplicantDraft} loading={generating} className="mt-4">
            Generate Draft for Recommender Review
          </Button>
        </div>
      )}

      {/* ── Generated content ── */}
      {content && (
        <div className="space-y-3">
          {generatedBy === "applicant" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Applicant-Prepared Draft — Pending Recommender Review
                </p>
                <select
                  value={approvalStatus}
                  onChange={(e) => setApprovalStatus(e.target.value as DraftApprovalStatus)}
                  className="rounded border border-amber-300 bg-white px-2 py-1 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-100"
                >
                  {Object.entries(APPROVAL_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                The recommender must review, edit, approve, and submit this letter. Do not present it as final until the recommender has approved it.
              </p>
            </div>
          )}

          <FieldGroup label="Draft (editable)">
            <Textarea
              className="min-h-64"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </FieldGroup>

          {voiceMatchScore !== null && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Voice Match Score: <span className="font-semibold">{voiceMatchScore}/100</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => handleRefine("professional", "professional")}
              loading={refining === "professional"}
              variant="secondary"
            >
              Make More Professional
            </Button>
            <Button
              onClick={() => handleRefine("shorten", "shorten")}
              loading={refining === "shorten"}
              variant="secondary"
            >
              Shorten Letter
            </Button>
            <Button
              onClick={() => handleRefine("strengthen", "strengthen")}
              loading={refining === "strengthen"}
              variant="secondary"
            >
              Strengthen Letter
            </Button>
            <Button
              onClick={() => handleRefine("add_examples", "add_examples")}
              loading={refining === "add_examples"}
              variant="secondary"
            >
              Sharpen Specifics
            </Button>
            <Button
              onClick={() => handleAdjustStrength(strength)}
              loading={refining === `strength_${strength}`}
              variant="secondary"
            >
              Adjust to {RECOMMENDATION_STRENGTH_LABELS[strength]}
            </Button>
            {generatedBy === "applicant" && (
              <>
                <Button onClick={handleAddReviewHeader} variant="secondary">
                  Recommender Review Version
                </Button>
                <Button onClick={handleRemoveReviewHeader} variant="secondary">
                  Final Approval Copy
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSave} loading={saving}>
              Save Draft
            </Button>
            <Button onClick={handleExport} variant="ghost">
              Export Final Draft
            </Button>
            {savedMessage && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">{savedMessage}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
