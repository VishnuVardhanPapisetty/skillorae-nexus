export type LearningSubtopic = {
  id: string;
  title: string;
};

export type LearningTopic = {
  id: string;
  title: string;
  subtopics: LearningSubtopic[];
};

export type LearningPhase = {
  id: string;
  title: string;
  topics: LearningTopic[];
};

export type QuizResult = {
  score: number;
  total: number;
  submittedAt: string;
};

export type LearningProgress = {
  version: 1;
  completedSubtopics: string[];
  quizResults: Record<string, QuizResult>;
};

export type PhaseProgress = {
  phaseId: string;
  completed: number;
  total: number;
  percentage: number;
};

export type LearningSummary = {
  completedSubtopics: number;
  totalSubtopics: number;
  completionPercentage: number;
  phaseProgress: PhaseProgress[];
  quizScorePercentage: number | null;
  assessedTopics: number;
  topicsMeetingQuizThreshold: number;
};

export const EMPTY_LEARNING_PROGRESS: LearningProgress = {
  version: 1,
  completedSubtopics: [],
  quizResults: {},
};

export function getLearningProgressKey(userId: string): string {
  return `nexus_learning_progress_${userId}`;
}

export function normalizeLearningProgress(value: unknown): LearningProgress {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_LEARNING_PROGRESS };
  }

  const record = value as Record<string, unknown>;
  const completedSubtopics = Array.isArray(record.completedSubtopics)
    ? [
        ...new Set(
          record.completedSubtopics.filter(
            (item): item is string => typeof item === "string",
          ),
        ),
      ]
    : [];
  const quizResults: Record<string, QuizResult> = {};

  if (record.quizResults && typeof record.quizResults === "object") {
    for (const [topicId, result] of Object.entries(record.quizResults)) {
      if (!result || typeof result !== "object") continue;

      const candidate = result as Record<string, unknown>;
      if (
        typeof candidate.score === "number" &&
        Number.isFinite(candidate.score) &&
        typeof candidate.total === "number" &&
        Number.isFinite(candidate.total) &&
        candidate.total > 0 &&
        typeof candidate.submittedAt === "string"
      ) {
        quizResults[topicId] = {
          score: Math.min(candidate.total, Math.max(0, candidate.score)),
          total: candidate.total,
          submittedAt: candidate.submittedAt,
        };
      }
    }
  }

  return { version: 1, completedSubtopics, quizResults };
}

export function toggleSubtopic(
  progress: LearningProgress,
  subtopicId: string,
): LearningProgress {
  const completed = new Set(progress.completedSubtopics);

  if (completed.has(subtopicId)) completed.delete(subtopicId);
  else completed.add(subtopicId);

  return { ...progress, completedSubtopics: [...completed] };
}

export function withQuizResult(
  progress: LearningProgress,
  topicId: string,
  result: QuizResult,
): LearningProgress {
  return {
    ...progress,
    quizResults: { ...progress.quizResults, [topicId]: result },
  };
}

export function computeLearningSummary(
  phases: LearningPhase[],
  progress: LearningProgress,
): LearningSummary {
  const completed = new Set(progress.completedSubtopics);
  let totalSubtopics = 0;
  let completedSubtopics = 0;

  const phaseProgress = phases.map((phase) => {
    const subtopics = phase.topics.flatMap((topic) => topic.subtopics);
    const phaseCompleted = subtopics.filter((item) =>
      completed.has(item.id),
    ).length;
    const phaseTotal = subtopics.length;
    totalSubtopics += phaseTotal;
    completedSubtopics += phaseCompleted;

    return {
      phaseId: phase.id,
      completed: phaseCompleted,
      total: phaseTotal,
      percentage:
        phaseTotal === 0 ? 0 : Math.round((phaseCompleted / phaseTotal) * 100),
    };
  });

  const topicIds = new Set(
    phases.flatMap((phase) => phase.topics.map((topic) => topic.id)),
  );
  const validResults = Object.entries(progress.quizResults).filter(
    ([topicId, result]) =>
      topicIds.has(topicId) &&
      result.total > 0 &&
      Number.isFinite(result.score),
  );
  const attemptedQuestions = validResults.reduce(
    (sum, [, result]) => sum + result.total,
    0,
  );
  const correctAnswers = validResults.reduce(
    (sum, [, result]) =>
      sum + Math.min(result.total, Math.max(0, result.score)),
    0,
  );

  return {
    completedSubtopics,
    totalSubtopics,
    completionPercentage:
      totalSubtopics === 0
        ? 0
        : Math.round((completedSubtopics / totalSubtopics) * 100),
    phaseProgress,
    quizScorePercentage:
      attemptedQuestions === 0
        ? null
        : Math.round((correctAnswers / attemptedQuestions) * 100),
    assessedTopics: validResults.length,
    topicsMeetingQuizThreshold: validResults.filter(
      ([, result]) => result.score / result.total >= 0.8,
    ).length,
  };
}

export function loadLearningProgress(
  storage: Storage,
  userId: string,
): LearningProgress {
  try {
    const serialized = storage.getItem(getLearningProgressKey(userId));
    return serialized
      ? normalizeLearningProgress(JSON.parse(serialized))
      : { ...EMPTY_LEARNING_PROGRESS };
  } catch {
    return { ...EMPTY_LEARNING_PROGRESS };
  }
}

export function saveLearningProgress(
  storage: Storage,
  userId: string,
  progress: LearningProgress,
): boolean {
  try {
    storage.setItem(
      getLearningProgressKey(userId),
      JSON.stringify(normalizeLearningProgress(progress)),
    );
    return true;
  } catch {
    return false;
  }
}
