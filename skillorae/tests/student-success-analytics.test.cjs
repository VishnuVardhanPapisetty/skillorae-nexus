const test = require("node:test");
const assert = require("node:assert/strict");
const {
  aggregateStudentAnalytics,
  calculateStudentSuccessAnalytics,
  DATA_CATEGORY_STATUS,
  getStudentSegment,
  MIN_SUCCESS_SCORE_COVERAGE,
  STUDENT_SUCCESS_THRESHOLDS,
  SUCCESS_SCORE_WEIGHTS,
} = require("../node_modules/.cache/nexus-analytics-test-build/student-success-analytics.js");

test("success score uses the documented weights and available-data denominator", () => {
  const result = calculateStudentSuccessAnalytics({
    marksPercentage: 80,
    attendancePercentage: 90,
    assignmentCompletionPercentage: 60,
  });

  assert.equal(SUCCESS_SCORE_WEIGHTS.academicPerformance, 35);
  assert.equal(SUCCESS_SCORE_WEIGHTS.attendance, 20);
  assert.equal(SUCCESS_SCORE_WEIGHTS.lmsActivity, 10);
  assert.equal(result.dataCoveragePercentage, 65);
  assert.equal(result.successScore, 80);
  assert.equal(result.reliabilityStatus, "Limited prototype heuristic");
  assert.equal(
    result.includedCategories.reduce((sum, item) => sum + item.contribution, 0),
    80,
  );
  assert.ok(result.scoreCaveat.includes("not a scientifically validated"));
});

test("missing categories are not zero and below-threshold coverage has no score", () => {
  const result = calculateStudentSuccessAnalytics({
    marksPercentage: 80,
    attendancePercentage: 90,
  });

  assert.equal(result.dataCoveragePercentage, 55);
  assert.equal(MIN_SUCCESS_SCORE_COVERAGE, 60);
  assert.equal(result.successScore, null);
  assert.equal(result.reliabilityStatus, "Insufficient data");
  assert.ok(result.missingCategories.includes("Engagement"));
  assert.ok(result.missingCategories.includes("Placement readiness"));
  assert.equal(result.riskLevel, "Insufficient data");
});

test("empty, invalid, and out-of-range metrics are excluded rather than zero-filled", () => {
  const empty = calculateStudentSuccessAnalytics({});
  const invalid = calculateStudentSuccessAnalytics({
    marksPercentage: 101,
    attendancePercentage: Number.NaN,
    assignmentCompletionPercentage: -1,
  });

  assert.equal(empty.successScore, null);
  assert.equal(empty.dataCoveragePercentage, 0);
  assert.equal(empty.riskLevel, "Insufficient data");
  assert.equal(invalid.successScore, null);
  assert.equal(invalid.dataCoveragePercentage, 0);
  assert.equal(invalid.dataQualityIssues.length, 3);
});

test("prototype risk thresholds are strict at their boundary values", () => {
  const boundary = calculateStudentSuccessAnalytics({
    marksPercentage: STUDENT_SUCCESS_THRESHOLDS.academicConcern,
    attendancePercentage: STUDENT_SUCCESS_THRESHOLDS.attendanceConcern,
    activeBacklogs: STUDENT_SUCCESS_THRESHOLDS.activeBacklogsElevated - 1,
    placementReadiness: STUDENT_SUCCESS_THRESHOLDS.placementReadinessConcern,
  });
  const concerns = calculateStudentSuccessAnalytics({
    marksPercentage: STUDENT_SUCCESS_THRESHOLDS.academicConcern - 1,
    attendancePercentage: STUDENT_SUCCESS_THRESHOLDS.attendanceConcern - 1,
  });
  const singleConcern = calculateStudentSuccessAnalytics({
    attendancePercentage: STUDENT_SUCCESS_THRESHOLDS.attendanceConcern - 1,
  });
  const backlogs = calculateStudentSuccessAnalytics({ activeBacklogs: 2 });

  assert.equal(boundary.riskFlags.length, 0);
  assert.equal(boundary.riskLevel, "Low");
  assert.equal(concerns.riskFlags.length, 2);
  assert.equal(concerns.riskLevel, "High");
  assert.equal(singleConcern.riskFlags.length, 1);
  assert.equal(singleConcern.riskLevel, "Insufficient data");
  assert.equal(backlogs.riskLevel, "High");
  assert.ok(backlogs.riskFlags[0].explanation.includes("2 active backlogs"));
});

test("only evidenced segment combinations are assigned", () => {
  const strongAcademicsLowPlacement = getStudentSegment({
    academicPerformance: 75,
    attendance: 80,
    assignmentCompletion: 80,
    placementReadiness: 49,
    academicTrendPercentagePoints: null,
    successScore: 70,
    dataCoveragePercentage: 80,
  });
  const decliningAcademicTrend = getStudentSegment({
    academicPerformance: 60,
    attendance: 74,
    assignmentCompletion: 80,
    placementReadiness: null,
    academicTrendPercentagePoints: -5,
    successScore: 60,
    dataCoveragePercentage: 65,
  });
  const assignmentProxySegment = getStudentSegment({
    academicPerformance: 75,
    attendance: 82,
    assignmentCompletion: 35,
    placementReadiness: null,
    academicTrendPercentagePoints: null,
    successScore: 70,
    dataCoveragePercentage: 65,
  });
  const missingHistory = getStudentSegment({
    academicPerformance: 49,
    attendance: 74,
    assignmentCompletion: null,
    placementReadiness: null,
    academicTrendPercentagePoints: null,
    successScore: null,
    dataCoveragePercentage: 55,
  });
  const placementStrongAcademicsWeak = getStudentSegment({
    academicPerformance: 49,
    attendance: 80,
    assignmentCompletion: 80,
    placementReadiness: 80,
    academicTrendPercentagePoints: null,
    successScore: 60,
    dataCoveragePercentage: 80,
  });
  const completeStrong = getStudentSegment({
    academicPerformance: 100,
    attendance: 100,
    assignmentCompletion: 100,
    placementReadiness: 100,
    academicTrendPercentagePoints: 0,
    successScore: 100,
    dataCoveragePercentage: 100,
  });

  assert.equal(
    strongAcademicsLowPlacement.key,
    "strong-academics-low-placement",
  );
  assert.equal(
    decliningAcademicTrend.key,
    "low-attendance-declining-academics",
  );
  assert.equal(assignmentProxySegment.key, "good-attendance-low-lms-proxy");
  assert.ok(assignmentProxySegment.rationale.includes("proxy"));
  assert.equal(missingHistory.key, "insufficient-data");
  assert.equal(
    placementStrongAcademicsWeak.key,
    "strong-placement-weaker-academics",
  );
  assert.equal(completeStrong.key, "strong-overall-performance");
});

test("interventions cite only observed values and configured thresholds", () => {
  const result = calculateStudentSuccessAnalytics({
    marksPercentage: 49,
    attendancePercentage: 74,
    assignmentCompletionPercentage: 35,
    activeBacklogs: 2,
    placementReadiness: 45,
  });
  const interventionsByKey = new Map(
    result.interventions.map((item) => [item.key, item.rationale]),
  );

  assert.match(interventionsByKey.get("academic-mentoring"), /49%/);
  assert.match(interventionsByKey.get("attendance-follow-up"), /74%/);
  assert.match(interventionsByKey.get("backlog-support"), /2 active backlogs/);
  assert.match(interventionsByKey.get("assignment-engagement"), /35%/);
  assert.match(interventionsByKey.get("assignment-engagement"), /proxy/);
  assert.match(interventionsByKey.get("placement-practice"), /45\/100/);
  assert.match(interventionsByKey.get("placement-practice"), /No aptitude/);
});

test("aggregation uses stable student IDs and excludes conflicting duplicate values", () => {
  const result = aggregateStudentAnalytics(
    [
      {
        id: "student-1",
        student_code: "S1",
        full_name: "Test Student",
        branch: "CSE",
        year: "2",
      },
      {
        id: "student-1",
        student_code: "S1-duplicate",
        full_name: "Duplicate Row",
        branch: "CSE",
        year: "2",
      },
    ],
    [
      {
        student_id: "student-1",
        attendance_percentage: 80,
        marks_percentage: 70,
        assignment_completion_percentage: 60,
      },
      {
        student_id: "student-1",
        attendance_percentage: 80,
        marks_percentage: 90,
        assignment_completion_percentage: 60,
      },
      {
        student_id: "another-student",
        attendance_percentage: 100,
        marks_percentage: 100,
        assignment_completion_percentage: 100,
      },
    ],
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].student.id, "student-1");
  assert.equal(result[0].academicRecord.attendance_percentage, 80);
  assert.equal(result[0].academicRecord.marks_percentage, null);
  assert.equal(result[0].analytics.successScore, null);
  assert.ok(
    result[0].analytics.dataQualityIssues.some((issue) =>
      issue.includes("Conflicting duplicate marks_percentage"),
    ),
  );
  assert.ok(
    result[0].analytics.dataQualityIssues.some((issue) =>
      issue.includes("Duplicate student identity rows"),
    ),
  );
});

test("data integration catalog labels unavailable sources explicitly", () => {
  assert.equal(
    DATA_CATEGORY_STATUS.find((item) => item.key === "engagement").status,
    "Unavailable",
  );
  assert.equal(
    DATA_CATEGORY_STATUS.find((item) => item.key === "lmsActivity").status,
    "Partial proxy",
  );
});
