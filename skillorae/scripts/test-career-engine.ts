import {
  getCareerMatches,
  getSkillGaps,
  getOverallReadiness,
} from "../app/lib/career-engine";

const student = {
  name: "Vijay",
  branch: "CSM",
  year: "2nd Year",
  cgpa: "7",
  attendance: 82,
  assignmentCompletion: 75,
  marks: 78,
  skills: ["Programming", "AI / ML"],
  skillLevels: {
    Programming: "Intermediate",
    "AI / ML": "Basic",
  },
  interests: "AI, personal AI systems",
  strengths: "Problem solving",
  weaknesses: "DSA",
};

const matches = getCareerMatches(student);

console.log("\n===== NEXUS CAREER ENGINE TEST =====");

console.log("\nCareer Matches:");
console.table(
  matches.map((match) => ({
    Career: match.career.name,
    Score: match.score,
    Matched: match.matchedSkills.join(", "),
    Missing: match.missingSkills.join(", "),
  })),
);

const bestCareer = matches[0]?.career;

if (!bestCareer) {
  throw new Error("No career match generated");
}

const gaps = getSkillGaps(student, bestCareer);

console.log("\nBest Career:", bestCareer.name);

console.log("\nSkill Gaps:");
console.table(
  gaps.map((gap) => ({
    Skill: gap.skill,
    Readiness: gap.readiness,
    Gap: gap.gap,
    Status: gap.status,
  })),
);

const readiness = getOverallReadiness(student, bestCareer);

console.log("\nOverall Readiness:", readiness);

if (readiness < 0 || readiness > 100) {
  throw new Error("Invalid readiness score");
}

console.log("\n✅ NEXUS ENGINE TEST PASSED");
