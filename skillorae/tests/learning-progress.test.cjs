const test = require("node:test");
const assert = require("node:assert/strict");
const {
  computeLearningSummary,
  loadLearningProgress,
  normalizeLearningProgress,
  saveLearningProgress,
  toggleSubtopic,
  withQuizResult,
} = require("../node_modules/.cache/nexus-progress-test-build/learning-progress.js");
const {
  getCareerRoadmap,
  getSampleQuiz,
} = require("../node_modules/.cache/nexus-progress-test-build/roadmap-content.js");

const phases = [
  {
    id: "phase-1",
    title: "Foundation",
    topics: [
      {
        id: "topic-1",
        title: "Python",
        subtopics: [
          { id: "subtopic-1", title: "Syntax" },
          { id: "subtopic-2", title: "Functions" },
        ],
      },
    ],
  },
  {
    id: "phase-2",
    title: "Projects",
    topics: [
      {
        id: "topic-2",
        title: "Practice",
        subtopics: [{ id: "subtopic-3", title: "Small project" }],
      },
    ],
  },
];

test("completion summary uses completed subtopics and phase denominators", () => {
  const progress = {
    version: 1,
    completedSubtopics: ["subtopic-1", "unknown-id"],
    quizResults: {},
  };

  assert.deepEqual(computeLearningSummary(phases, progress), {
    completedSubtopics: 1,
    totalSubtopics: 3,
    completionPercentage: 33,
    phaseProgress: [
      { phaseId: "phase-1", completed: 1, total: 2, percentage: 50 },
      { phaseId: "phase-2", completed: 0, total: 1, percentage: 0 },
    ],
    quizScorePercentage: null,
    assessedTopics: 0,
    topicsMeetingQuizThreshold: 0,
  });
});

test("quiz score, attempts, and threshold evidence remain separate", () => {
  const progress = {
    version: 1,
    completedSubtopics: [],
    quizResults: {
      "topic-1": { score: 4, total: 5, submittedAt: "2026-10-14" },
      "topic-2": { score: 1, total: 2, submittedAt: "2026-10-14" },
    },
  };
  const summary = computeLearningSummary(phases, progress);

  assert.equal(summary.completionPercentage, 0);
  assert.equal(summary.quizScorePercentage, 71);
  assert.equal(summary.assessedTopics, 2);
  assert.equal(summary.topicsMeetingQuizThreshold, 1);
});

test("empty roadmap and malformed saved values do not throw", () => {
  assert.equal(
    computeLearningSummary([], normalizeLearningProgress(null))
      .completionPercentage,
    0,
  );
  assert.equal(
    computeLearningSummary([], normalizeLearningProgress(null))
      .quizScorePercentage,
    null,
  );
  assert.deepEqual(
    normalizeLearningProgress({ completedSubtopics: [4, "ok", "ok"] })
      .completedSubtopics,
    ["ok"],
  );
});

test("completion can be toggled and saved state is scoped by user", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const initial = { version: 1, completedSubtopics: [], quizResults: {} };
  const changed = toggleSubtopic(initial, "subtopic-1");
  const withQuiz = withQuizResult(changed, "topic-1", {
    score: 2,
    total: 3,
    submittedAt: "2026-10-14",
  });

  assert.equal(saveLearningProgress(storage, "student-a", withQuiz), true);
  assert.deepEqual(loadLearningProgress(storage, "student-a"), withQuiz);
  assert.deepEqual(loadLearningProgress(storage, "student-b"), initial);
  assert.deepEqual(
    toggleSubtopic(changed, "subtopic-1").completedSubtopics,
    [],
  );
});

test("career catalogs keep four phases and stable unique topic IDs", () => {
  for (const career of [
    "AI / ML Engineer",
    "Software Engineer",
    "Data Scientist",
    "Cybersecurity Engineer",
    "Data Analyst",
    "Full-Stack Developer",
    "Cloud / DevOps Engineer",
  ]) {
    const roadmap = getCareerRoadmap(career);
    const topics = roadmap.flatMap((phase) => phase.topics);

    assert.equal(roadmap.length, 4, `${career} phase count`);
    assert.ok(roadmap.every((phase) => phase.topics.length >= 4));
    assert.equal(new Set(topics.map((topic) => topic.id)).size, topics.length);
    assert.ok(topics.every((topic) => topic.subtopics.length > 0));
  }
});

test("sample quiz is topic-associated and includes review explanations", () => {
  const questions = getSampleQuiz("Practice SQL joins");

  assert.equal(questions.length, 3);
  assert.ok(questions[0].prompt.includes("Practice SQL joins"));
  assert.ok(questions.every((question) => question.explanation.length > 0));
  assert.ok(
    questions.every(
      (question) =>
        question.correctIndex >= 0 &&
        question.correctIndex < question.options.length,
    ),
  );
});
