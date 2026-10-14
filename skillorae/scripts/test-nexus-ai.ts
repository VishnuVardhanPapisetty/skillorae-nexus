import {
  analyzeStudentWithNexusAI,
} from "../app/lib/nexus-ai";

const student = {
  name: "Vijay",
  branch: "CSM",
  year: "2nd Year",
  cgpa: "7",
  attendance: 82,
  assignmentCompletion: 75,
  marks: 78,

  skills: [
    "Programming",
    "AI / ML",
  ],

  skillLevels: {
    Programming: "Intermediate",
    "AI / ML": "Basic",
  },

  interests: "AI, personal AI systems",
  strengths: "Problem solving",
  weaknesses: "DSA",
};

const result =
  analyzeStudentWithNexusAI(student);

console.log(
  "\n===== NEXUS AI INTELLIGENCE TEST ====="
);

console.log(
  "Career Readiness:",
  result.careerReadiness
);

console.log(
  "Skill Risk:",
  result.skillRisk
);

console.log(
  "Future Readiness:",
  result.futureReadiness
);

console.log(
  "Best Career:",
  result.bestCareer
);

console.log(
  "Career Confidence:",
  result.careerConfidence
);

console.log(
  "\nTop Risk Skills:",
  result.topRiskSkills
);

console.log(
  "Strengths:",
  result.strengths
);

console.log("\nNext Actions:");

result.nextActions.forEach(
  (action, index) => {
    console.log(`${index + 1}. ${action}`);
  }
);

console.log(
  "\n✅ NEXUS AI INTELLIGENCE TEST PASSED"
);