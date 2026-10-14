const test = require("node:test");
const assert = require("node:assert/strict");

const careerEngine = require("../node_modules/.cache/nexus-test-build/career-engine.js");
const recommendationEngine = require("../node_modules/.cache/nexus-test-build/recommendation-engine.js");

const {
  getAllCareers,
  getCareerByName,
  getCareerMatches,
  calculateCareerMatch,
  calculateSkillReadiness,
  getSkillGaps,
  getOverallReadiness,
} = careerEngine;

const { getRecommendations } = recommendationEngine;

const baseStudent = {
  name: "Test Student",
  branch: "CSM",
  year: "2nd Year",
  cgpa: "7.5",
  skills: ["Programming", "Web Development"],
  skillLevels: {
    Programming: "Intermediate",
    "Web Development": "Beginner",
  },
  attendance: 85,
  marks: 78,
  assignmentCompletion: 90,
};

test("all seven career paths are available", () => {
  const careers = getAllCareers();

  assert.equal(careers.length, 7);
  assert.ok(
    careers.every((career) => career.name && career.requiredSkills.length > 0),
  );
});

test("career lookup ignores capitalization and surrounding spaces", () => {
  assert.equal(
    getCareerByName("  software engineer ")?.name,
    "Software Engineer",
  );
  assert.equal(getCareerByName("unknown career"), undefined);
});

test("career matches have valid scores and are sorted highest first", () => {
  const matches = getCareerMatches(baseStudent);

  assert.equal(matches.length, getAllCareers().length);

  for (const match of matches) {
    assert.ok(Number.isFinite(match.score));
    assert.ok(match.score >= 0 && match.score <= 100);
    assert.ok(Array.isArray(match.matchedSkills));
    assert.ok(Array.isArray(match.missingSkills));
    assert.ok(match.explanation.length > 0);
  }

  for (let i = 1; i < matches.length; i++) {
    assert.ok(matches[i - 1].score >= matches[i].score);
  }
});

test("skill readiness stays within 0–100", () => {
  const career = getCareerByName("Software Engineer");
  assert.ok(career);

  for (const skill of career.requiredSkills) {
    const readiness = calculateSkillReadiness(baseStudent, skill);
    assert.ok(Number.isFinite(readiness));
    assert.ok(readiness >= 0 && readiness <= 100);
  }
});

test("skill gaps have consistent gap values and status labels", () => {
  const career = getCareerByName("Software Engineer");
  assert.ok(career);

  const gaps = getSkillGaps(baseStudent, career);

  assert.equal(gaps.length, career.requiredSkills.length);

  for (const item of gaps) {
    assert.ok(item.readiness >= 0 && item.readiness <= 100);
    assert.equal(item.gap, 100 - item.readiness);

    const expectedStatus =
      item.readiness >= 80
        ? "Strong"
        : item.readiness >= 60
          ? "Developing"
          : "Needs Improvement";

    assert.equal(item.status, expectedStatus);
  }
});

test("overall readiness stays within 0–100 with academic data", () => {
  const career = getCareerByName("Software Engineer");
  assert.ok(career);

  const readiness = getOverallReadiness(baseStudent, career);

  assert.ok(Number.isFinite(readiness));
  assert.ok(readiness >= 0 && readiness <= 100);
});

test("overall readiness handles missing optional academic metrics", () => {
  const career = getCareerByName("AI / ML Engineer");
  assert.ok(career);

  const student = {
    name: "Minimal Student",
    branch: "CSM",
    year: "2nd Year",
    cgpa: "7",
    skills: [],
  };

  const readiness = getOverallReadiness(student, career);

  assert.ok(Number.isFinite(readiness));
  assert.ok(readiness >= 0 && readiness <= 100);
});

test("recommendations contain usable fields for a normal profile", () => {
  const career = getCareerByName("Software Engineer");
  assert.ok(career);

  const skillGaps = getSkillGaps(baseStudent, career);
  const readiness = getOverallReadiness(baseStudent, career);

  const recommendations = getRecommendations({
    student: baseStudent,
    career,
    skillGaps,
    readiness,
    futureReadiness: Math.min(100, readiness + 20),
    scenario: "consistent",
  });

  assert.ok(recommendations.length > 0);
  assert.ok(recommendations.some((item) => item.category === "Priority Focus"));

  for (const item of recommendations) {
    assert.ok(item.title.trim().length > 0);
    assert.ok(item.description.trim().length > 0);
    assert.ok(item.action.trim().length > 0);
    assert.ok(["High", "Medium", "Low"].includes(item.priority));
  }
});

test("recommendations handle an invalid CGPA without crashing", () => {
  const career = getCareerByName("Data Analyst");
  assert.ok(career);

  const student = { ...baseStudent, cgpa: "not-entered" };
  const skillGaps = getSkillGaps(student, career);

  const recommendations = getRecommendations({
    student,
    career,
    skillGaps,
    readiness: 45,
    futureReadiness: 55,
    scenario: "conservative",
  });

  assert.ok(recommendations.length > 0);
  assert.ok(recommendations.every((item) => item.title.length > 0));
});

test("career matching reports known and missing skills separately", () => {
  const career = getCareerByName("Software Engineer");
  assert.ok(career);

  const match = calculateCareerMatch(
    { ...baseStudent, skills: ["Programming"] },
    career,
  );

  assert.ok(match.matchedSkills.includes("Programming"));
  assert.ok(match.missingSkills.includes("Web Development"));
});
