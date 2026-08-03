"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Textarea } from "@/components/ui/Field";
import {
  ATTRIBUTE_LABELS,
  CORE_ATTRIBUTES,
  PERSPECTIVE_QUESTIONS,
  type AttributeExample,
  type CoreAttribute,
  type PerspectiveResponse,
  type PersonalityProfile,
  type RecommenderType,
} from "@/types/recommendation";

const emptyExample = (attribute: CoreAttribute): AttributeExample => ({
  attribute,
  situation: "",
  action: "",
  observation: "",
  whoAffected: "",
  result: "",
  significance: "",
});

export function PersonalityForm({
  recommenderType,
  initialValue,
  onSave,
}: {
  recommenderType: RecommenderType;
  initialValue: PersonalityProfile | null;
  onSave: (profile: PersonalityProfile) => Promise<void>;
}) {
  const questions = PERSPECTIVE_QUESTIONS[recommenderType];

  const [description, setDescription] = useState(initialValue?.description ?? "");
  const [examples, setExamples] = useState<AttributeExample[]>(
    initialValue?.attributeExamples ?? []
  );
  const [responses, setResponses] = useState<PerspectiveResponse[]>(
    initialValue?.perspectiveResponses ??
      questions.map((q) => ({ questionId: q.id, question: q.question, answer: "" }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAttributes = new Set(examples.map((e) => e.attribute));

  const toggleAttribute = (attribute: CoreAttribute) => {
    setExamples((prev) =>
      selectedAttributes.has(attribute)
        ? prev.filter((e) => e.attribute !== attribute)
        : [...prev, emptyExample(attribute)]
    );
  };

  const updateExample = (
    attribute: CoreAttribute,
    field: keyof Omit<AttributeExample, "attribute">,
    value: string
  ) => {
    setExamples((prev) =>
      prev.map((e) => (e.attribute === attribute ? { ...e, [field]: value } : e))
    );
  };

  const updateResponse = (questionId: string, answer: string) => {
    setResponses((prev) =>
      prev.map((r) => (r.questionId === questionId ? { ...r, answer } : r))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        description,
        attributeExamples: examples,
        perspectiveResponses: responses,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save personality details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <FieldGroup label="How would you describe the applicant's character?">
        <Textarea
          placeholder="What kind of person is the applicant in a clinical, academic, or professional setting? How do they interact with patients, classmates, coworkers, faculty, or team members?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FieldGroup>

      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Core attributes
        </h3>
        <div className="flex flex-wrap gap-2">
          {CORE_ATTRIBUTES.map((attribute) => (
            <button
              key={attribute}
              type="button"
              onClick={() => toggleAttribute(attribute)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                selectedAttributes.has(attribute)
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {ATTRIBUTE_LABELS[attribute]}
            </button>
          ))}
        </div>
      </div>

      {examples.length > 0 && (
        <div className="space-y-4">
          {examples.map((example) => (
            <div
              key={example.attribute}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <h4 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {ATTRIBUTE_LABELS[example.attribute]}
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldGroup label="What happened?">
                  <Input
                    value={example.situation}
                    onChange={(e) =>
                      updateExample(example.attribute, "situation", e.target.value)
                    }
                  />
                </FieldGroup>
                <FieldGroup label="What did the applicant do?">
                  <Input
                    value={example.action}
                    onChange={(e) =>
                      updateExample(example.attribute, "action", e.target.value)
                    }
                  />
                </FieldGroup>
                <FieldGroup label="What did you personally observe?">
                  <Input
                    value={example.observation}
                    onChange={(e) =>
                      updateExample(example.attribute, "observation", e.target.value)
                    }
                  />
                </FieldGroup>
                <FieldGroup label="Who was affected?">
                  <Input
                    value={example.whoAffected ?? ""}
                    onChange={(e) =>
                      updateExample(example.attribute, "whoAffected", e.target.value)
                    }
                  />
                </FieldGroup>
                <FieldGroup label="What was the result?">
                  <Input
                    value={example.result ?? ""}
                    onChange={(e) =>
                      updateExample(example.attribute, "result", e.target.value)
                    }
                  />
                </FieldGroup>
                <FieldGroup label="Why does this example matter?">
                  <Input
                    value={example.significance}
                    onChange={(e) =>
                      updateExample(example.attribute, "significance", e.target.value)
                    }
                  />
                </FieldGroup>
              </div>
            </div>
          ))}
        </div>
      )}

      {questions.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Recommender perspective
          </h3>
          <div className="space-y-3">
            {responses.map((response) => (
              <FieldGroup key={response.questionId} label={response.question}>
                <Textarea
                  value={response.answer}
                  onChange={(e) => updateResponse(response.questionId, e.target.value)}
                />
              </FieldGroup>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button onClick={handleSave} loading={saving}>
        Save Personality & Attributes
      </Button>
    </div>
  );
}
