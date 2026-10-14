export const SUCCESS_SCORE_WEIGHTS = {
  academicPerformance: 35,
  attendance: 20,
  lmsActivity: 10,
  engagement: 10,
  placementReadiness: 15,
  skillsAssessment: 10,
} as const;

export const MIN_SUCCESS_SCORE_COVERAGE = 60;

export const STUDENT_SUCCESS_THRESHOLDS = {
  attendanceConcern: 75,
  academicConcern: 50,
  activeBacklogsElevated: 2,
  placementReadinessConcern: 50,
  strongAcademicSegment: 70,
  strongPlacementSegment: 70,
  strongOverallSegment: 75,
} as const;

export type RiskLevel = "High" | "Moderate" | "Low" | "Insufficient data";

export type StudentAnalyticsMetrics = {
  marksPercentage?: unknown;
  attendancePercentage?: unknown;
  assignmentCompletionPercentage?: unknown;
  engagementPercentage?: unknown;
  placementReadiness?: unknown;
  skillsAssessment?: unknown;
  activeBacklogs?: unknown;
  academicTrendPercentagePoints?: unknown;
};

export type StudentSuccessAnalysis = {
  successScore: number | null;
  dataCoveragePercentage: number;
  minimumCoveragePercentage: number;
  reliabilityStatus: "Insufficient data" | "Limited prototype heuristic";
  scoreCaveat: string;
  includedCategories: Array<{
    key: keyof typeof SUCCESS_SCORE_WEIGHTS;
    label: string;
    observedScore: number;
    weight: number;
    contribution: number;
    source: string;
  }>;
  missingCategories: string[];
  dataQualityIssues: string[];
  riskCoveragePercentage: number;
  riskLevel: RiskLevel;
  riskFlags: Array<{
    key: string;
    level: "High" | "Moderate";
    observedValue: number;
    threshold: number;
    explanation: string;
  }>;
  segment: {
    key: string;
    label: string;
    rationale: string;
  };
  interventions: Array<{
    key: string;
    title: string;
    rationale: string;
  }>;
};

export type StudentIdentity = {
  id: string;
  student_code: string;
  full_name: string;
  branch: string;
  year: string;
};

export type StudentAcademicRecord = {
  student_id: string;
  attendance_percentage: number | null;
  marks_percentage: number | null;
  assignment_completion_percentage: number | null;
};

export type AggregatedStudentAnalytics = {
  student: StudentIdentity;
  academicRecord: Omit<StudentAcademicRecord, "student_id">;
  analytics: StudentSuccessAnalysis;
};

export const DATA_CATEGORY_STATUS = [
  {
    key: "academicPerformance",
    label: "Academic performance",
    status: "Partial",
    available: "Faculty-maintained marks_percentage (0-100).",
    missing:
      "CGPA is student-reported and browser-local; subject results and backlogs are not persisted in this schema.",
  },
  {
    key: "attendance",
    label: "Attendance",
    status: "Partial",
    available: "Faculty-maintained overall attendance_percentage.",
    missing:
      "No subject-wise or historical attendance series is available in current queries.",
  },
  {
    key: "lmsActivity",
    label: "LMS activity",
    status: "Partial proxy",
    available:
      "assignment_completion_percentage is used only as an assignment-completion proxy.",
    missing:
      "LMS logins, sessions, and detailed learning activity are not integrated.",
  },
  {
    key: "engagement",
    label: "Engagement",
    status: "Unavailable",
    available: "No engagement records are currently queried.",
    missing:
      "Events, clubs, hackathons, and certifications are not persisted in the active student flow.",
  },
  {
    key: "placementReadiness",
    label: "Placement readiness",
    status: "Unavailable",
    available:
      "The career engine calculates career readiness from reported skills, but it is not an aptitude/coding/mock-interview assessment and is not roster-persisted.",
    missing: "No placement assessment records are available for analytics.",
  },
  {
    key: "skillsAssessment",
    label: "Skills assessment",
    status: "Unavailable",
    available:
      "Students self-report skills and levels in browser-local profile data.",
    missing:
      "No verified skills-assessment records are available to the roster analytics service.",
  },
  {
    key: "feedback",
    label: "Feedback",
    status: "Unavailable",
    available: "Feedback is not included in numeric score inputs.",
    missing:
      "Student satisfaction and faculty feedback records are not integrated.",
  },
] as const;

const scoreCategoryDefinitions = [
  {
    key: "academicPerformance",
    label: "Academic performance",
    weight: SUCCESS_SCORE_WEIGHTS.academicPerformance,
    source: "academic_records.marks_percentage",
  },
  {
    key: "attendance",
    label: "Attendance",
    weight: SUCCESS_SCORE_WEIGHTS.attendance,
    source: "academic_records.attendance_percentage",
  },
  {
    key: "lmsActivity",
    label: "Assignment completion proxy",
    weight: SUCCESS_SCORE_WEIGHTS.lmsActivity,
    source: "academic_records.assignment_completion_percentage",
  },
  {
    key: "engagement",
    label: "Engagement",
    weight: SUCCESS_SCORE_WEIGHTS.engagement,
    source: "No integrated source",
  },
  {
    key: "placementReadiness",
    label: "Placement readiness",
    weight: SUCCESS_SCORE_WEIGHTS.placementReadiness,
    source: "No integrated assessment source",
  },
  {
    key: "skillsAssessment",
    label: "Skills assessment",
    weight: SUCCESS_SCORE_WEIGHTS.skillsAssessment,
    source: "No verified assessment source",
  },
] as const;

const riskWeights = {
  academicPerformance: 35,
  attendance: 20,
  activeBacklogs: 10,
  placementReadiness: 15,
} as const;

const minimumRiskCoverage = 60;
const totalRiskWeight = Object.values(riskWeights).reduce(
  (sum, weight) => sum + weight,
  0,
);

function readPercentage(
  value: unknown,
  field: string,
  issues: Set<string>,
): number | null {
  if (value == null) return null;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    issues.add(`Invalid ${field} value was excluded.`);
    return null;
  }
  return value;
}

function readNonNegativeInteger(
  value: unknown,
  field: string,
  issues: Set<string>,
): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    issues.add(`Invalid ${field} value was excluded.`);
    return null;
  }
  return value;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function calculateStudentSuccessAnalytics(
  metrics: StudentAnalyticsMetrics,
): StudentSuccessAnalysis {
  const issues = new Set<string>();
  const observed = {
    academicPerformance: readPercentage(
      metrics.marksPercentage,
      "marks_percentage",
      issues,
    ),
    attendance: readPercentage(
      metrics.attendancePercentage,
      "attendance_percentage",
      issues,
    ),
    lmsActivity: readPercentage(
      metrics.assignmentCompletionPercentage,
      "assignment_completion_percentage",
      issues,
    ),
    engagement: readPercentage(
      metrics.engagementPercentage,
      "engagement",
      issues,
    ),
    placementReadiness: readPercentage(
      metrics.placementReadiness,
      "placement_readiness",
      issues,
    ),
    skillsAssessment: readPercentage(
      metrics.skillsAssessment,
      "skills_assessment",
      issues,
    ),
  };
  const includedCategories = scoreCategoryDefinitions.flatMap((definition) => {
    const observedScore = observed[definition.key];
    if (observedScore === null) return [];
    return [{ ...definition, observedScore, contribution: 0 }];
  });
  const dataCoveragePercentage = includedCategories.reduce(
    (sum, item) => sum + item.weight,
    0,
  );
  const weightedTotal = includedCategories.reduce(
    (sum, item) => sum + item.observedScore * item.weight,
    0,
  );
  const successScore =
    dataCoveragePercentage >= MIN_SUCCESS_SCORE_COVERAGE
      ? Math.round(weightedTotal / dataCoveragePercentage)
      : null;
  const weightedContributions = includedCategories.map((item) => ({
    ...item,
    contribution:
      successScore === null
        ? 0
        : roundOneDecimal(
            (item.observedScore * item.weight) / dataCoveragePercentage,
          ),
  }));
  const missingCategories = scoreCategoryDefinitions
    .filter((definition) => observed[definition.key] === null)
    .map((definition) => definition.label);

  const marks = observed.academicPerformance;
  const attendance = observed.attendance;
  const assignmentCompletion = observed.lmsActivity;
  const activeBacklogs = readNonNegativeInteger(
    metrics.activeBacklogs,
    "active_backlogs",
    issues,
  );
  const placementReadiness = observed.placementReadiness;
  const academicTrend =
    typeof metrics.academicTrendPercentagePoints === "number" &&
    Number.isFinite(metrics.academicTrendPercentagePoints) &&
    metrics.academicTrendPercentagePoints >= -100 &&
    metrics.academicTrendPercentagePoints <= 100
      ? metrics.academicTrendPercentagePoints
      : null;
  if (metrics.academicTrendPercentagePoints != null && academicTrend === null) {
    issues.add("Invalid academic trend value was excluded.");
  }

  const riskSignals = [
    marks === null ? 0 : riskWeights.academicPerformance,
    attendance === null ? 0 : riskWeights.attendance,
    activeBacklogs === null ? 0 : riskWeights.activeBacklogs,
    placementReadiness === null ? 0 : riskWeights.placementReadiness,
  ];
  const riskCoveragePercentage = Math.round(
    (riskSignals.reduce((sum, value) => sum + value, 0) / totalRiskWeight) *
      100,
  );

  const riskFlags: StudentSuccessAnalysis["riskFlags"] = [];
  if (marks !== null && marks < STUDENT_SUCCESS_THRESHOLDS.academicConcern) {
    riskFlags.push({
      key: "academic-performance",
      level: "Moderate",
      observedValue: marks,
      threshold: STUDENT_SUCCESS_THRESHOLDS.academicConcern,
      explanation: `Marks are ${marks}%, below the prototype concern threshold of ${STUDENT_SUCCESS_THRESHOLDS.academicConcern}%.`,
    });
  }
  if (
    attendance !== null &&
    attendance < STUDENT_SUCCESS_THRESHOLDS.attendanceConcern
  ) {
    riskFlags.push({
      key: "attendance",
      level: "Moderate",
      observedValue: attendance,
      threshold: STUDENT_SUCCESS_THRESHOLDS.attendanceConcern,
      explanation: `Attendance is ${attendance}%, below the prototype concern threshold of ${STUDENT_SUCCESS_THRESHOLDS.attendanceConcern}%.`,
    });
  }
  if (
    activeBacklogs !== null &&
    activeBacklogs >= STUDENT_SUCCESS_THRESHOLDS.activeBacklogsElevated
  ) {
    riskFlags.push({
      key: "active-backlogs",
      level: "High",
      observedValue: activeBacklogs,
      threshold: STUDENT_SUCCESS_THRESHOLDS.activeBacklogsElevated,
      explanation: `${activeBacklogs} active backlogs meet the prototype elevated-concern threshold of ${STUDENT_SUCCESS_THRESHOLDS.activeBacklogsElevated}.`,
    });
  }
  if (
    placementReadiness !== null &&
    placementReadiness < STUDENT_SUCCESS_THRESHOLDS.placementReadinessConcern
  ) {
    riskFlags.push({
      key: "placement-readiness",
      level: "Moderate",
      observedValue: placementReadiness,
      threshold: STUDENT_SUCCESS_THRESHOLDS.placementReadinessConcern,
      explanation: `Placement readiness is ${placementReadiness}/100, below the prototype preparation threshold of ${STUDENT_SUCCESS_THRESHOLDS.placementReadinessConcern}.`,
    });
  }

  const moderateRiskCount = riskFlags.filter(
    (flag) => flag.level === "Moderate",
  ).length;
  const completeRiskEvidence =
    marks !== null &&
    attendance !== null &&
    activeBacklogs !== null &&
    placementReadiness !== null;
  const riskLevel: RiskLevel = riskFlags.some((flag) => flag.level === "High")
    ? "High"
    : riskCoveragePercentage < minimumRiskCoverage
      ? "Insufficient data"
      : moderateRiskCount >= 2
        ? "High"
        : !completeRiskEvidence
          ? "Insufficient data"
          : moderateRiskCount === 1
            ? "Moderate"
            : "Low";

  const segment = getStudentSegment({
    academicPerformance: marks,
    attendance,
    assignmentCompletion,
    placementReadiness,
    academicTrendPercentagePoints: academicTrend,
    successScore,
    dataCoveragePercentage,
  });

  const interventions: StudentSuccessAnalysis["interventions"] = [];
  if (marks !== null && marks < STUDENT_SUCCESS_THRESHOLDS.academicConcern) {
    interventions.push({
      key: "academic-mentoring",
      title: "Academic mentoring",
      rationale: `Faculty-reported marks are ${marks}%, below the ${STUDENT_SUCCESS_THRESHOLDS.academicConcern}% prototype threshold. Subject-level marks are unavailable, so this recommendation is not subject-specific.`,
    });
  }
  if (
    attendance !== null &&
    attendance < STUDENT_SUCCESS_THRESHOLDS.attendanceConcern
  ) {
    interventions.push({
      key: "attendance-follow-up",
      title: "Attendance follow-up",
      rationale: `Recorded overall attendance is ${attendance}%, below the ${STUDENT_SUCCESS_THRESHOLDS.attendanceConcern}% prototype threshold.`,
    });
  }
  if (
    activeBacklogs !== null &&
    activeBacklogs >= STUDENT_SUCCESS_THRESHOLDS.activeBacklogsElevated
  ) {
    interventions.push({
      key: "backlog-support",
      title: "Backlog support",
      rationale: `${activeBacklogs} active backlogs meet the prototype threshold of ${STUDENT_SUCCESS_THRESHOLDS.activeBacklogsElevated}.`,
    });
  }
  if (assignmentCompletion !== null && assignmentCompletion < 50) {
    interventions.push({
      key: "assignment-engagement",
      title: "Assignment completion support",
      rationale: `Recorded assignment completion is ${assignmentCompletion}%. This is an assignment-completion proxy, not LMS login or session data.`,
    });
  }
  if (
    placementReadiness !== null &&
    placementReadiness < STUDENT_SUCCESS_THRESHOLDS.placementReadinessConcern
  ) {
    interventions.push({
      key: "placement-practice",
      title: "Placement practice support",
      rationale: `Recorded placement readiness is ${placementReadiness}/100. No aptitude, coding, or mock-interview breakdown is available to target a specific practice area.`,
    });
  }

  return {
    successScore,
    dataCoveragePercentage,
    minimumCoveragePercentage: MIN_SUCCESS_SCORE_COVERAGE,
    reliabilityStatus:
      successScore === null
        ? "Insufficient data"
        : "Limited prototype heuristic",
    scoreCaveat:
      "This configurable, coverage-aware prototype score is not a scientifically validated prediction or a guarantee of student outcomes.",
    includedCategories: weightedContributions,
    missingCategories,
    dataQualityIssues: [...issues],
    riskCoveragePercentage,
    riskLevel,
    riskFlags,
    segment,
    interventions,
  };
}

export type SegmentStudent = {
  academicPerformance: number | null;
  attendance: number | null;
  assignmentCompletion: number | null;
  placementReadiness: number | null;
  academicTrendPercentagePoints: number | null;
  successScore: number | null;
  dataCoveragePercentage: number;
};

export function getStudentSegment(student: SegmentStudent): {
  key: string;
  label: string;
  rationale: string;
} {
  const {
    academicPerformance,
    attendance,
    assignmentCompletion,
    placementReadiness,
    academicTrendPercentagePoints,
    successScore,
    dataCoveragePercentage,
  } = student;

  if (
    academicPerformance !== null &&
    academicPerformance >= STUDENT_SUCCESS_THRESHOLDS.strongAcademicSegment &&
    placementReadiness !== null &&
    placementReadiness < STUDENT_SUCCESS_THRESHOLDS.placementReadinessConcern
  ) {
    return {
      key: "strong-academics-low-placement",
      label: "Strong academics, placement preparation needed",
      rationale: `Marks are ${academicPerformance}% and placement readiness is ${placementReadiness}/100.`,
    };
  }

  if (
    attendance !== null &&
    attendance < STUDENT_SUCCESS_THRESHOLDS.attendanceConcern &&
    academicTrendPercentagePoints !== null &&
    academicTrendPercentagePoints < 0
  ) {
    return {
      key: "low-attendance-declining-academics",
      label: "Attendance and academic trend support",
      rationale: `Attendance is ${attendance}% and comparable historical academic performance declined ${Math.abs(academicTrendPercentagePoints)} percentage points.`,
    };
  }

  if (
    attendance !== null &&
    attendance >= STUDENT_SUCCESS_THRESHOLDS.attendanceConcern &&
    assignmentCompletion !== null &&
    assignmentCompletion < 50
  ) {
    return {
      key: "good-attendance-low-lms-proxy",
      label: "Good attendance, low assignment completion",
      rationale: `Attendance is ${attendance}%; assignment completion is ${assignmentCompletion}%. Assignment completion is only an LMS activity proxy.`,
    };
  }

  if (
    placementReadiness !== null &&
    placementReadiness >= STUDENT_SUCCESS_THRESHOLDS.strongPlacementSegment &&
    academicPerformance !== null &&
    academicPerformance < STUDENT_SUCCESS_THRESHOLDS.academicConcern
  ) {
    return {
      key: "strong-placement-weaker-academics",
      label: "Placement readiness strength, academic support needed",
      rationale: `Placement readiness is ${placementReadiness}/100 and marks are ${academicPerformance}%.`,
    };
  }

  if (
    successScore !== null &&
    successScore >= STUDENT_SUCCESS_THRESHOLDS.strongOverallSegment &&
    dataCoveragePercentage === 100
  ) {
    return {
      key: "strong-overall-performance",
      label: "Strong overall observed performance",
      rationale: `The heuristic score is ${successScore}/100 with complete coverage of the configured score categories.`,
    };
  }

  return {
    key: "insufficient-data",
    label: "Insufficient data for reliable segmentation",
    rationale:
      "The required combinations of historical, placement, engagement, or assessment evidence are not all available.",
  };
}

export type AnalyticsStudent = StudentIdentity;

export function aggregateStudentAnalytics(
  students: AnalyticsStudent[],
  academicRecords: StudentAcademicRecord[],
): AggregatedStudentAnalytics[] {
  const uniqueStudents = new Map<string, StudentIdentity>();
  const duplicateStudentIds = new Set<string>();
  for (const student of students) {
    if (uniqueStudents.has(student.id)) {
      duplicateStudentIds.add(student.id);
      continue;
    }
    uniqueStudents.set(student.id, student);
  }

  const recordsByStudent = new Map<string, StudentAcademicRecord[]>();
  for (const record of academicRecords) {
    if (!record || typeof record.student_id !== "string") continue;
    const records = recordsByStudent.get(record.student_id) ?? [];
    records.push(record);
    recordsByStudent.set(record.student_id, records);
  }

  return [...uniqueStudents.values()].map((student) => {
    const records = recordsByStudent.get(student.id) ?? [];
    const issues = new Set<string>();
    if (duplicateStudentIds.has(student.id)) {
      issues.add(
        "Duplicate student identity rows were collapsed by stable ID.",
      );
    }
    if (records.length > 1) {
      issues.add(
        `Multiple academic records found for ${student.student_code}.`,
      );
    }

    const resolveField = (
      field: keyof Omit<StudentAcademicRecord, "student_id">,
    ): number | null => {
      const uniqueValues = new Set<number>();
      for (const record of records) {
        const value = record[field];
        if (
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < 0 ||
          value > 100
        ) {
          if (value != null) issues.add(`Invalid ${field} value was excluded.`);
          continue;
        }
        uniqueValues.add(value);
      }

      if (uniqueValues.size > 1) {
        issues.add(`Conflicting duplicate ${field} values were excluded.`);
        return null;
      }
      return uniqueValues.size === 1 ? [...uniqueValues][0] : null;
    };

    const academicRecord = {
      attendance_percentage: resolveField("attendance_percentage"),
      marks_percentage: resolveField("marks_percentage"),
      assignment_completion_percentage: resolveField(
        "assignment_completion_percentage",
      ),
    };
    const analytics = calculateStudentSuccessAnalytics({
      marksPercentage: academicRecord.marks_percentage,
      attendancePercentage: academicRecord.attendance_percentage,
      assignmentCompletionPercentage:
        academicRecord.assignment_completion_percentage,
    });
    analytics.dataQualityIssues.push(...issues);

    return { student, academicRecord, analytics };
  });
}

export function summarizeSegments(students: AggregatedStudentAnalytics[]) {
  const segmentDefinitions = [
    {
      key: "strong-academics-low-placement",
      label: "Strong academics, placement preparation needed",
      requiredCategories: ["Academic marks", "Placement readiness"],
    },
    {
      key: "low-attendance-declining-academics",
      label: "Attendance and declining academic trend support",
      requiredCategories: ["Attendance", "Historical academic trend"],
    },
    {
      key: "good-attendance-low-lms-proxy",
      label: "Good attendance, low assignment completion",
      requiredCategories: ["Attendance", "Assignment completion proxy"],
    },
    {
      key: "strong-placement-weaker-academics",
      label: "Placement readiness strength, academic support needed",
      requiredCategories: ["Placement readiness", "Academic marks"],
    },
    {
      key: "strong-overall-performance",
      label: "Strong overall observed performance",
      requiredCategories: ["All configured score categories"],
    },
    {
      key: "insufficient-data",
      label: "Insufficient data for reliable segmentation",
      requiredCategories: [],
    },
  ];
  const assignedCounts = new Map<string, number>();
  const includedCategories = students.map(
    (student) =>
      new Set(student.analytics.includedCategories.map((item) => item.key)),
  );
  for (const student of students) {
    const key = student.analytics.segment.key;
    assignedCounts.set(key, (assignedCounts.get(key) ?? 0) + 1);
  }

  const segmentDataAvailable = (key: string): boolean => {
    switch (key) {
      case "strong-academics-low-placement":
      case "strong-placement-weaker-academics":
        return includedCategories.some(
          (categories) =>
            categories.has("academicPerformance") &&
            categories.has("placementReadiness"),
        );
      case "low-attendance-declining-academics":
        return false;
      case "good-attendance-low-lms-proxy":
        return includedCategories.some(
          (categories) =>
            categories.has("attendance") && categories.has("lmsActivity"),
        );
      case "strong-overall-performance":
        return students.some(
          (student) => student.analytics.dataCoveragePercentage === 100,
        );
      default:
        return true;
    }
  };

  return segmentDefinitions.map((segment) => {
    const dataAvailable = segmentDataAvailable(segment.key);
    return {
      ...segment,
      count: dataAvailable ? (assignedCounts.get(segment.key) ?? 0) : null,
      dataAvailable,
    };
  });
}
