import { getRecommendations } from "../app/lib/recommendation-engine";

import {
  getCareerByName,
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

const career = getCareerByName("Software Engineer");

if (!career) {
  throw new Error("Career not found");
}

const skillGaps = getSkillGaps(student, career);

const readiness = getOverallReadiness(student, career);

const futureReadiness = Math.min(100, readiness + 15);

const recommendations = getRecommendations({
  student,
  career,
  skillGaps,
  readiness,
  futureReadiness,
  scenario: "Improve My Biggest Skill Gap",
});

console.log("\n===== NEXUS RECOMMENDATION ENGINE TEST =====");

console.log("\nCareer:", career.name);

console.log("Current Readiness:", readiness);

console.log("Future Readiness:", futureReadiness);

console.log("\nSkill Gaps:");

console.table(
  skillGaps.map((gap) => ({
    Skill: gap.skill,
    Readiness: gap.readiness,
    Gap: gap.gap,
    Status: gap.status,
  })),
);

console.log("\nRecommendations:");

console.table(
  recommendations.map((item) => ({
    Priority: item.priority,
    Category: item.category,
    Title: item.title,
    Action: item.action,
  })),
);

if (recommendations.length === 0) {
  throw new Error("No recommendations generated");
}

console.log(`\nGenerated ${recommendations.length} recommendations`);

console.log("\n✅ NEXUS RECOMMENDATION ENGINE TEST PASSED");
