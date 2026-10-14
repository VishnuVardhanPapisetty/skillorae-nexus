import {
  getCareerMatches,
  getSkillGaps,
  getOverallReadiness,
  type StudentProfile,
  type CareerMatch,
  type SkillGap,
} from "./career-engine";

export type NexusAIResult = {
  careerReadiness: number;
  skillRisk: number;
  futureReadiness: number;
  bestCareer: string;
  careerConfidence: number;
  topRiskSkills: string[];
  strengths: string[];
  nextActions: string[];
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function analyzeStudentWithNexusAI(
  student: StudentProfile
): NexusAIResult {
  const matches: CareerMatch[] = getCareerMatches(student);

  if (matches.length === 0) {
    throw new Error("NEXUS could not find a career match.");
  }

  const bestMatch = matches[0];

  const skillGaps: SkillGap[] = getSkillGaps(
    student,
    bestMatch.career
  );

  const careerReadiness = getOverallReadiness(
    student,
    bestMatch.career
  );

  const priorityGaps = skillGaps
    .filter((gap) => gap.status === "Needs Improvement")
    .sort((a, b) => b.gap - a.gap);

  const developingSkills = skillGaps
    .filter((gap) => gap.status === "Developing")
    .sort((a, b) => a.readiness - b.readiness);

  const strongSkills = skillGaps
    .filter((gap) => gap.status === "Strong")
    .sort((a, b) => b.readiness - a.readiness);

  const academicSignals = [
    student.attendance,
    student.assignmentCompletion,
    student.marks,
  ].filter(
    (value): value is number =>
      typeof value === "number"
  );

  const academicHealth =
    academicSignals.length > 0
      ? academicSignals.reduce(
          (sum, value) => sum + value,
          0
        ) / academicSignals.length
      : Number(student.cgpa || 0) * 10;

  const skillRisk = clamp(
    priorityGaps.length * 18 +
      developingSkills.length * 7 +
      Math.max(0, 70 - academicHealth) * 0.3
  );

  const careerConfidence = clamp(
    bestMatch.score
  );

  const futureGrowth =
    priorityGaps.length > 0
      ? Math.min(20, priorityGaps.length * 6)
      : 12;

  const futureReadiness = clamp(
    careerReadiness + futureGrowth
  );

  const nextActions: string[] = [];

  for (const gap of priorityGaps.slice(0, 3)) {
    nextActions.push(
      `Improve ${gap.skill} from ${gap.readiness}% readiness.`
    );
  }

  if (
    typeof student.marks === "number" &&
    student.marks < 75
  ) {
    nextActions.push(
      "Improve academic performance through consistent revision and practice."
    );
  }

  if (
    typeof student.attendance === "number" &&
    student.attendance < 75
  ) {
    nextActions.push(
      "Improve attendance to reduce academic risk."
    );
  }

  if (nextActions.length === 0) {
    nextActions.push(
      "Build stronger projects aligned with your target career."
    );
  }

  return {
    careerReadiness,
    skillRisk,
    futureReadiness,
    bestCareer: bestMatch.career.name,
    careerConfidence,
    topRiskSkills: priorityGaps
      .slice(0, 3)
      .map((gap) => gap.skill),
    strengths: strongSkills
      .slice(0, 3)
      .map((gap) => gap.skill),
    nextActions: nextActions.slice(0, 5),
  };
}