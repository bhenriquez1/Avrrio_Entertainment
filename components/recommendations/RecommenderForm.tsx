"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/Field";
import {
  RECOMMENDATION_STATUSES,
  STATUS_LABELS,
  type Recommender,
  type RecommendationStatus,
  type RecommenderType,
} from "@/types/recommendation";

const RECOMMENDER_TYPES: { value: RecommenderType; label: string }[] = [
  { value: "dentist", label: "Dentist" },
  { value: "professor", label: "Professor / Faculty" },
  { value: "employer", label: "Employer" },
  { value: "research_mentor", label: "Research Mentor" },
  { value: "volunteer_supervisor", label: "Volunteer Supervisor" },
  { value: "healthcare_professional", label: "Healthcare Professional" },
  { value: "other", label: "Other" },
];

export type RecommenderFormValues = Pick<
  Recommender,
  | "name"
  | "role"
  | "email"
  | "institution"
  | "relationshipToApplicant"
  | "recommenderType"
  | "deadline"
  | "notes"
  | "status"
>;

const emptyValues: RecommenderFormValues = {
  name: "",
  role: "",
  email: "",
  institution: "",
  relationshipToApplicant: "",
  recommenderType: "professor",
  deadline: null,
  notes: "",
  status: "not_requested",
};

export function RecommenderForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Save Recommender",
}: {
  initialValues?: Partial<RecommenderFormValues>;
  onSubmit: (values: RecommenderFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<RecommenderFormValues>({
    ...emptyValues,
    ...initialValues,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof RecommenderFormValues>(
    key: K,
    value: RecommenderFormValues[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save recommender");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="Name">
          <Input
            required
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </FieldGroup>
        <FieldGroup label="Role / Title">
          <Input
            required
            value={values.role}
            onChange={(e) => update("role", e.target.value)}
          />
        </FieldGroup>
        <FieldGroup label="Email">
          <Input
            type="email"
            required
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </FieldGroup>
        <FieldGroup label="Institution / Clinic / Company">
          <Input
            value={values.institution}
            onChange={(e) => update("institution", e.target.value)}
          />
        </FieldGroup>
        <FieldGroup label="Relationship to Applicant">
          <Input
            value={values.relationshipToApplicant}
            onChange={(e) => update("relationshipToApplicant", e.target.value)}
          />
        </FieldGroup>
        <FieldGroup label="Recommender Type">
          <Select
            value={values.recommenderType}
            onChange={(e) => update("recommenderType", e.target.value as RecommenderType)}
          >
            {RECOMMENDER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup label="Deadline">
          <Input
            type="date"
            value={values.deadline ?? ""}
            onChange={(e) => update("deadline", e.target.value || null)}
          />
        </FieldGroup>
        <FieldGroup label="Status">
          <Select
            value={values.status}
            onChange={(e) => update("status", e.target.value as RecommendationStatus)}
          >
            {RECOMMENDATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </FieldGroup>
      </div>
      <FieldGroup label="Notes">
        <Textarea
          value={values.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </FieldGroup>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
