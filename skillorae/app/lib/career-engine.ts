export type StudentProfile = {
  name: string;
  branch: string;
  year: string;
  cgpa: string;
  skills: string[];

  // New NEXUS intelligence data
  attendance?: number;
  assignmentCompletion?: number;
  marks?: number;
  interests?: string;
  strengths?: string;
  weaknesses?: string;
  skillLevels?: Record<string, string>;
};

export type CareerProfile = {
  name: string;
  description: string;
  requiredSkills: string[];
  preferredBranches: string[];
};

export type CareerMatch = {
  career: CareerProfile;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  explanation: string;
};

export type SkillGap = {
  skill: string;
  readiness: number;
  gap: number;
  status: "Strong" | "Developing" | "Needs Improvement";
};

const careers: CareerProfile[] = [
  {
    name: "AI / ML Engineer",
    description:
      "Build intelligent systems, machine learning models, and AI-powered applications.",
    requiredSkills: ["Programming", "AI / ML", "Data"],
    preferredBranches: ["CSM", "CSE", "AI", "AIML", "IT"],
  },
  {
    name: "Software Engineer",
    description:
      "Design, develop, test, and maintain scalable software applications.",
    requiredSkills: ["Programming", "Web Development"],
    preferredBranches: ["CSM", "CSE", "IT", "ECE"],
  },
  {
    name: "Data Scientist",
    description:
      "Use data, statistics, programming, and machine learning to solve complex problems.",
    requiredSkills: ["Programming", "Data", "AI / ML"],
    preferredBranches: ["CSM", "CSE", "AI", "AIML", "IT"],
  },
  {
    name: "Cybersecurity Engineer",
    description:
      "Protect applications, networks, systems, and data from security threats.",
    requiredSkills: ["Programming", "Cybersecurity"],
    preferredBranches: ["CSM", "CSE", "IT", "ECE"],
  },
  {
    name: "Data Analyst",
    description:
      "Analyze data and create insights that help organizations make better decisions.",
    requiredSkills: ["Data", "Programming"],
    preferredBranches: ["CSM", "CSE", "AI", "AIML", "IT", "ECE"],
  },
  {
    name: "Full-Stack Developer",
    description:
      "Build complete web applications across frontend, backend, databases, and APIs.",
    requiredSkills: ["Programming", "Web Development"],
    preferredBranches: ["CSM", "CSE", "IT", "ECE"],
  },
  {
    name: "Cloud / DevOps Engineer",
    description:
      "Build, deploy, automate, and maintain reliable cloud-based software systems.",
    requiredSkills: ["Programming", "Web Development", "Data"],
    preferredBranches: ["CSM", "CSE", "IT", "ECE"],
  },
];

function normalizeBranch(branch: string): string {
  const value = branch.trim().toLowerCase();

  const aliases: Record<string, string> = {
    csm: "CSM",
    cse: "CSE",
    cs: "CSE",
    it: "IT",
    aiml: "AIML",
    "ai/ml": "AIML",
    ai: "AI",
    ml: "AI",
    ece: "ECE",
    eee: "EEE",
    mechanical: "MECHANICAL",
  };

  return aliases[value] ?? branch.trim().toUpperCase();
}

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase();
}

/* -------------------------------------------------------
   ACADEMIC INTELLIGENCE
------------------------------------------------------- */

function calculateAcademicScore(cgpa: string): number {
  const value = Number(cgpa);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(15, Math.max(0, (value / 10) * 15));
}

function calculateAcademicHealth(student: StudentProfile): number {
  const signals: number[] = [];

  const cgpa = Number(student.cgpa);

  if (Number.isFinite(cgpa)) {
    signals.push((Math.min(10, Math.max(0, cgpa)) / 10) * 100);
  }

  if (typeof student.marks === "number") {
    signals.push(Math.min(100, Math.max(0, student.marks)));
  }

  if (typeof student.attendance === "number") {
    signals.push(Math.min(100, Math.max(0, student.attendance)));
  }

  if (typeof student.assignmentCompletion === "number") {
    signals.push(Math.min(100, Math.max(0, student.assignmentCompletion)));
  }

  if (signals.length === 0) {
    return 50;
  }

  return Math.round(
    signals.reduce((sum, value) => sum + value, 0) / signals.length,
  );
}

/* -------------------------------------------------------
   SKILL INTELLIGENCE
------------------------------------------------------- */

function skillLevelToReadiness(level?: string): number | null {
  if (!level) {
    return null;
  }

  switch (level.trim().toLowerCase()) {
    case "beginner":
      return 25;

    case "basic":
      return 45;

    case "intermediate":
      return 70;

    case "advanced":
      return 90;

    default:
      return null;
  }
}

function getReportedSkillLevel(
  student: StudentProfile,
  skill: string,
): string | undefined {
  if (!student.skillLevels) {
    return undefined;
  }

  const exactLevel = student.skillLevels[skill];

  if (exactLevel) {
    return exactLevel;
  }

  const matchingKey = Object.keys(student.skillLevels).find(
    (key) => normalizeSkill(key) === normalizeSkill(skill),
  );

  return matchingKey ? student.skillLevels[matchingKey] : undefined;
}

/* -------------------------------------------------------
   CAREER MATCHING
------------------------------------------------------- */

export function calculateCareerMatch(
  student: StudentProfile,
  career: CareerProfile,
): CareerMatch {
  const studentSkills = student.skills.map(normalizeSkill);

  const matchedSkills = career.requiredSkills.filter((skill) =>
    studentSkills.includes(normalizeSkill(skill)),
  );

  const missingSkills = career.requiredSkills.filter(
    (skill) => !studentSkills.includes(normalizeSkill(skill)),
  );

  /*
    Instead of simply giving 70 points for "having" a skill,
    NEXUS now evaluates the reported level of each skill.
  */

  const skillReadinessValues = career.requiredSkills.map((skill) =>
    calculateSkillReadiness(student, skill),
  );

  const averageSkillReadiness =
    skillReadinessValues.length > 0
      ? skillReadinessValues.reduce((sum, value) => sum + value, 0) /
        skillReadinessValues.length
      : 0;

  const skillScore = (averageSkillReadiness / 100) * 70;

  const studentBranch = normalizeBranch(student.branch);

  const branchScore = career.preferredBranches.includes(studentBranch) ? 15 : 5;

  const academicScore = calculateAcademicScore(student.cgpa);

  /*
    Small academic-health adjustment.

    This does NOT turn attendance into skill proficiency.
    It only slightly influences career readiness.
  */

  const academicHealth = calculateAcademicHealth(student);

  const academicHealthAdjustment = ((academicHealth - 50) / 50) * 5;

  const score = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        skillScore + branchScore + academicScore + academicHealthAdjustment,
      ),
    ),
  );

  let explanation = "";

  if (averageSkillReadiness >= 80) {
    explanation = `Your demonstrated skill levels strongly align with ${career.name}.`;
  } else if (averageSkillReadiness >= 60) {
    explanation = `You have a developing foundation for ${career.name}. Strengthening ${missingSkills.length > 0 ? missingSkills.join(", ") : "your existing skills"} would improve your readiness.`;
  } else {
    explanation = `Your current skill evidence shows an early foundation for ${career.name}. Focus on the required skills to improve your readiness.`;
  }

  return {
    career,
    score,
    matchedSkills,
    missingSkills,
    explanation,
  };
}

/* -------------------------------------------------------
   CAREER LIST
------------------------------------------------------- */

export function getCareerMatches(student: StudentProfile): CareerMatch[] {
  return careers
    .map((career) => calculateCareerMatch(student, career))
    .sort((a, b) => b.score - a.score);
}

export function getCareerByName(name: string): CareerProfile | undefined {
  return careers.find(
    (career) => career.name.toLowerCase() === name.trim().toLowerCase(),
  );
}

/* -------------------------------------------------------
   SKILL READINESS
------------------------------------------------------- */

export function calculateSkillReadiness(
  student: StudentProfile,
  skill: string,
): number {
  const hasSkill = student.skills.some(
    (studentSkill) => normalizeSkill(studentSkill) === normalizeSkill(skill),
  );

  /*
    If the student selected the skill and provided a level,
    use that level as the primary evidence.
  */

  if (hasSkill) {
    const reportedLevel = getReportedSkillLevel(student, skill);

    const levelReadiness = skillLevelToReadiness(reportedLevel);

    if (levelReadiness !== null) {
      return levelReadiness;
    }

    /*
      Backward compatibility:
      Old profiles may not contain skillLevels.
    */

    return 60;
  }

  /*
    Missing skill.

    We don't assume the student knows nothing.
    Academic evidence gives a small baseline.
  */

  const cgpa = Number(student.cgpa);

  if (Number.isFinite(cgpa)) {
    return Math.min(55, Math.max(20, Math.round(cgpa * 5)));
  }

  return 20;
}

/* -------------------------------------------------------
   SKILL GAPS
------------------------------------------------------- */

export function getSkillGaps(
  student: StudentProfile,
  career: CareerProfile,
): SkillGap[] {
  return career.requiredSkills.map((skill) => {
    const readiness = calculateSkillReadiness(student, skill);

    const gap = Math.max(0, 100 - readiness);

    let status: SkillGap["status"];

    if (readiness >= 80) {
      status = "Strong";
    } else if (readiness >= 60) {
      status = "Developing";
    } else {
      status = "Needs Improvement";
    }

    return {
      skill,
      readiness,
      gap,
      status,
    };
  });
}

/* -------------------------------------------------------
   OVERALL READINESS
------------------------------------------------------- */

export function getOverallReadiness(
  student: StudentProfile,
  career: CareerProfile,
): number {
  const gaps = getSkillGaps(student, career);

  if (gaps.length === 0) {
    return 0;
  }

  const skillReadiness =
    gaps.reduce((sum, item) => sum + item.readiness, 0) / gaps.length;

  const academicHealth = calculateAcademicHealth(student);

  /*
    Overall NEXUS readiness:

    70% → career skill readiness
    30% → academic/consistency health

    This keeps the score career-focused while still
    considering the student's current academic condition.
  */

  const overall = skillReadiness * 0.7 + academicHealth * 0.3;

  return Math.round(Math.min(100, Math.max(0, overall)));
}

/* -------------------------------------------------------
   ALL CAREERS
------------------------------------------------------- */

export function getAllCareers(): CareerProfile[] {
  return careers;
}
