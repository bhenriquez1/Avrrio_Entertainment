export type RecommenderType =
  | "dentist"
  | "professor"
  | "employer"
  | "research_mentor"
  | "volunteer_supervisor"
  | "healthcare_professional"
  | "other";

export type RecommendationStatus =
  | "not_requested"
  | "requested"
  | "in_progress"
  | "submitted"
  | "received"
  | "missing"
  | "follow_up_needed";

export const RECOMMENDATION_STATUSES: RecommendationStatus[] = [
  "not_requested",
  "requested",
  "in_progress",
  "submitted",
  "received",
  "missing",
  "follow_up_needed",
];

export const STATUS_LABELS: Record<RecommendationStatus, string> = {
  not_requested: "Not Requested",
  requested: "Requested",
  in_progress: "In Progress",
  submitted: "Submitted",
  received: "Received",
  missing: "Missing",
  follow_up_needed: "Follow-Up Needed",
};

export type LetterType =
  | "dental_school"
  | "medical_school"
  | "faculty"
  | "dentist"
  | "employer"
  | "research_mentor"
  | "scholarship"
  | "graduate_school";

export const LETTER_TYPE_LABELS: Record<LetterType, string> = {
  dental_school: "Dental School Recommendation",
  medical_school: "Medical School Recommendation",
  faculty: "Faculty Recommendation",
  dentist: "Dentist Recommendation",
  employer: "Employer Recommendation",
  research_mentor: "Research Mentor Recommendation",
  scholarship: "Scholarship Recommendation",
  graduate_school: "Graduate School Recommendation",
};

export type CoreAttribute =
  | "compassion"
  | "reliability"
  | "discipline"
  | "maturity"
  | "work_ethic"
  | "humility"
  | "leadership"
  | "curiosity"
  | "resilience"
  | "integrity"
  | "communication"
  | "teamwork"
  | "empathy"
  | "professionalism"
  | "coachability"
  | "attention_to_detail"
  | "initiative"
  | "patience"
  | "responsibility"
  | "cultural_awareness"
  | "service_orientation";

export const CORE_ATTRIBUTES: CoreAttribute[] = [
  "compassion",
  "reliability",
  "discipline",
  "maturity",
  "work_ethic",
  "humility",
  "leadership",
  "curiosity",
  "resilience",
  "integrity",
  "communication",
  "teamwork",
  "empathy",
  "professionalism",
  "coachability",
  "attention_to_detail",
  "initiative",
  "patience",
  "responsibility",
  "cultural_awareness",
  "service_orientation",
];

export const ATTRIBUTE_LABELS: Record<CoreAttribute, string> = {
  compassion: "Compassion",
  reliability: "Reliability",
  discipline: "Discipline",
  maturity: "Maturity",
  work_ethic: "Work Ethic",
  humility: "Humility",
  leadership: "Leadership",
  curiosity: "Curiosity",
  resilience: "Resilience",
  integrity: "Integrity",
  communication: "Communication",
  teamwork: "Teamwork",
  empathy: "Empathy",
  professionalism: "Professionalism",
  coachability: "Coachability",
  attention_to_detail: "Attention to Detail",
  initiative: "Initiative",
  patience: "Patience",
  responsibility: "Responsibility",
  cultural_awareness: "Cultural Awareness",
  service_orientation: "Service Orientation",
};

export interface AttributeExample {
  attribute: CoreAttribute;
  situation: string;
  action: string;
  observation: string;
  whoAffected?: string;
  result?: string;
  significance: string;
}

/** Recommender-type-specific perspective prompts, keyed loosely by question id. */
export interface PerspectiveResponse {
  questionId: string;
  question: string;
  answer: string;
}

export const PERSPECTIVE_QUESTIONS: Record<RecommenderType, { id: string; question: string }[]> = {
  dentist: [
    { id: "chairside_professionalism", question: "Chairside professionalism" },
    { id: "patient_interaction", question: "Patient interaction" },
    { id: "infection_control", question: "Infection control awareness" },
    { id: "manual_dexterity", question: "Manual dexterity" },
    { id: "clinical_curiosity", question: "Clinical curiosity" },
    { id: "respect_for_team", question: "Respect for the dental team" },
    { id: "growth_over_time", question: "Growth over time" },
  ],
  professor: [
    { id: "academic_discipline", question: "Academic discipline" },
    { id: "class_participation", question: "Class participation" },
    { id: "intellectual_curiosity", question: "Intellectual curiosity" },
    { id: "persistence", question: "Persistence with difficult material" },
    { id: "writing_research", question: "Writing or research ability" },
    { id: "professionalism_faculty", question: "Professionalism with faculty" },
    { id: "growth_semester", question: "Growth over the semester" },
  ],
  employer: [
    { id: "reliability", question: "Reliability" },
    { id: "responsibility", question: "Responsibility" },
    { id: "teamwork", question: "Teamwork" },
    { id: "communication", question: "Communication" },
    { id: "leadership", question: "Leadership" },
    { id: "problem_solving", question: "Problem-solving" },
    { id: "consistency_under_pressure", question: "Consistency under pressure" },
  ],
  research_mentor: [
    { id: "intellectual_curiosity", question: "Intellectual curiosity" },
    { id: "persistence", question: "Persistence through setbacks" },
    { id: "writing_research", question: "Research and writing ability" },
    { id: "growth_over_time", question: "Growth over time in the lab" },
  ],
  volunteer_supervisor: [
    { id: "service_commitment", question: "Commitment to service" },
    { id: "reliability_volunteer", question: "Reliability and attendance" },
    { id: "interpersonal_skills", question: "Interpersonal skills with those they served" },
    { id: "initiative_volunteer", question: "Initiative and self-direction" },
    { id: "cultural_sensitivity", question: "Cultural sensitivity and awareness" },
    { id: "growth_volunteer", question: "Personal and professional growth" },
  ],
  healthcare_professional: [
    { id: "patient_care", question: "Quality of patient care and bedside manner" },
    { id: "clinical_competence", question: "Clinical competence and preparedness" },
    { id: "professionalism_hc", question: "Professionalism in a clinical setting" },
    { id: "teamwork_hc", question: "Teamwork with healthcare staff" },
    { id: "compassion_hc", question: "Compassion toward patients" },
    { id: "growth_hc", question: "Growth and learning over time" },
  ],
  other: [],
};

export type RecommendationStrength =
  | "supportive"
  | "strongly_supportive"
  | "enthusiastic"
  | "highest";

export const RECOMMENDATION_STRENGTH_LABELS: Record<RecommendationStrength, string> = {
  supportive: "Supportive",
  strongly_supportive: "Strongly Supportive",
  enthusiastic: "Enthusiastic",
  highest: "Highest Recommendation",
};

export type DraftLetterStatus =
  | "information_incomplete"
  | "draft_in_progress"
  | "drafted_by_applicant"
  | "pending_recommender_review"
  | "recommender_edited"
  | "approved_by_recommender"
  | "ready_for_submission";

export const DRAFT_LETTER_STATUS_LABELS: Record<DraftLetterStatus, string> = {
  information_incomplete: "Information Incomplete",
  draft_in_progress: "Draft in Progress",
  drafted_by_applicant: "Drafted by Applicant",
  pending_recommender_review: "Pending Recommender Review",
  recommender_edited: "Recommender Edited",
  approved_by_recommender: "Approved by Recommender",
  ready_for_submission: "Ready for Submission",
};

export type PersonalStatementTheme =
  | "service"
  | "resilience"
  | "patient_centered_care"
  | "scientific_curiosity"
  | "advocacy"
  | "access_to_care"
  | "personal_growth"
  | "cultural_understanding"
  | "leadership_through_service";

export const PERSONAL_STATEMENT_THEME_LABELS: Record<PersonalStatementTheme, string> = {
  service: "Service",
  resilience: "Resilience",
  patient_centered_care: "Patient-Centered Care",
  scientific_curiosity: "Scientific Curiosity",
  advocacy: "Advocacy",
  access_to_care: "Access to Care",
  personal_growth: "Personal Growth",
  cultural_understanding: "Cultural Understanding",
  leadership_through_service: "Leadership Through Service",
};

export type ExperienceCategory =
  | "clinical"
  | "shadowing"
  | "employment"
  | "volunteer"
  | "research"
  | "leadership"
  | "personal_challenge"
  | "cultural"
  | "turning_point"
  | "failure_recovery"
  | "mentorship"
  | "patient_interaction"
  | "other";

export const EXPERIENCE_CATEGORY_LABELS: Record<ExperienceCategory, string> = {
  clinical: "Clinical Experience",
  shadowing: "Shadowing",
  employment: "Employment",
  volunteer: "Volunteer Work",
  research: "Research",
  leadership: "Leadership",
  personal_challenge: "Personal Challenge",
  cultural: "Cultural Experience",
  turning_point: "Turning Point",
  failure_recovery: "Failure & Recovery",
  mentorship: "Mentorship",
  patient_interaction: "Patient Interaction",
  other: "Other",
};

export interface PersonalStatementExperience {
  id: string;
  category: ExperienceCategory;
  whatHappened: string;
  myRole: string;
  thoughtFeeling: string;
  whatILearned: string;
  howItChangedMe: string;
  howItInfluencedGoal: string;
}

export interface PersonalStatementVoice {
  whyThisProfession: string;
  mostInfluentialExperience: string;
  whatKindOfProfessional: string;
  whatCommitteeShouldKnow: string;
}

export interface PersonalStatementOutline {
  openingStory: string;
  motivation: string;
  development: string;
  growth: string;
  whyThisProfession: string;
  futureContribution: string;
  conclusion: string;
}

export interface PersonalStatementQualityEntry {
  attribute: CoreAttribute;
  supportingExperience: string;
}

export type VoiceProfileType =
  | "formal_professor"
  | "friendly_professor"
  | "clinical_dentist"
  | "practice_owner"
  | "research_mentor"
  | "employer_supervisor"
  | "custom";

export const VOICE_PROFILE_LABELS: Record<VoiceProfileType, string> = {
  formal_professor: "Formal Professor",
  friendly_professor: "Friendly Professor",
  clinical_dentist: "Clinical Dentist",
  practice_owner: "Practice Owner",
  research_mentor: "Research Mentor",
  employer_supervisor: "Employer / Supervisor",
  custom: "Custom Voice",
};

export interface VoiceCapture {
  /** 2-5 sentences in the recommender's own words */
  naturalDescription: string;
  voiceProfile: VoiceProfileType;
  /** Optional pasted prior writing sample (email, letter, evaluation) used as a voice reference */
  writingSample?: string;
}

export interface PersonalityProfile {
  /** How the recommender would describe the applicant, in a clinical/academic/professional setting */
  description: string;
  attributeExamples: AttributeExample[];
  perspectiveResponses: PerspectiveResponse[];
}

export interface Recommender {
  id: string;
  name: string;
  role: string;
  email: string;
  institution: string;
  relationshipToApplicant: string;
  recommenderType: RecommenderType;
  deadline: string | null;
  notes: string;
  status: RecommendationStatus;
  lastFollowUpDate: string | null;
  voiceCapture: VoiceCapture | null;
  personality: PersonalityProfile | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicantProfile {
  applicantName: string;
  achievements: string[];
  volunteerExperiences: string[];
  shadowingExperiences: string[];
  workHistory: string[];
  leadership: string[];
  awards: string[];
  updatedAt: string;
}

export type DraftAuthor = "recommender" | "applicant";
export type DraftApprovalStatus = "drafted" | "pending_review" | "approved";

export interface LetterDraft {
  id: string;
  recommenderId: string;
  letterType: LetterType;
  content: string;
  voiceMatchScore: number | null;
  draftedBy?: DraftAuthor;
  approvalStatus?: DraftApprovalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicantDraftAnswers {
  // Applicant information
  applicantFullName: string;
  programType: string;
  schoolsOrApplicationType: string;
  careerGoal: string;
  personalQualities: string;
  achievements: string;
  // Recommender information
  recommenderFullName: string;
  recommenderTitle: string;
  recommenderInstitution: string;
  relationshipToApplicant: string;
  howLongKnown: string;
  contextKnown: string;
  // Evidence
  academicExamples: string;
  clinicalExamples: string;
  patientInteraction: string;
  workEthic: string;
  leadership: string;
  reliability: string;
  professionalism: string;
  growthOverTime: string;
  realStoriesObservations: string;
  // Recommender voice
  voiceSentences: string;
  writingSample: string;
  // Recommender-type-specific perspective answers, keyed by question id
  perspectiveAnswers: Record<string, string>;
}

export type RequestEmailType = "request" | "follow_up" | "thank_you";
export type EmailTone = "formal" | "warm" | "concise" | "grateful";

export interface RequestEmail {
  id: string;
  recommenderId: string;
  type: RequestEmailType;
  tone: EmailTone;
  content: string;
  createdAt: string;
}

export interface LetterAnalysis {
  strength: number;
  specificity: number;
  credibility: number;
  tone: string;
  admissionsImpact: string;
  genericPhrases: string[];
  missingExamples: string[];
  suggestions: string[];
}

export interface PersonalStatement {
  id: string;
  topic: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuidedLetterAnswers {
  applicantName: string;
  recommenderNameTitle: string;
  relationshipToApplicant: string;
  howLongKnown: string;
  settingKnown: string;
  strongestQualities: string;
  realExampleOrMemory: string;
  whyRecommend: string;
  programSchoolType: string;
  desiredTone: string;
}

export interface ReapplicantCycle {
  id: string;
  cycleLabel: string;
  schoolsApplied: string[];
  outcome: string;
  feedbackReceived: string;
  lessonsLearned: string;
  whatToImproveNextCycle: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommitteePacketSelection {
  recommenderIds: string[];
  includeResume: boolean;
  includePersonalStatement: boolean;
  includeAchievementsSummary: boolean;
  includeVolunteerSummary: boolean;
  includeShadowingSummary: boolean;
  includeLeadershipSummary: boolean;
  includeWorkHistorySummary: boolean;
}
