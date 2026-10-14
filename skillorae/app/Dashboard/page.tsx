"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../lib/supabase";
import { getStudentStorageKey } from "../lib/student-storage";

import {
  getCareerByName,
  getSkillGaps,
  getOverallReadiness,
  StudentProfile,
} from "../lib/career-engine";

import {
  getRecommendations,
  Recommendation,
} from "../lib/recommendation-engine";

import { analyzeStudentWithNexusAI, NexusAIResult } from "../lib/nexus-ai";
import {
  computeLearningSummary,
  EMPTY_LEARNING_PROGRESS,
  loadLearningProgress,
  type LearningProgress,
} from "../lib/learning-progress";
import { getCareerRoadmap } from "../lib/roadmap-content";
import { calculateStudentSuccessAnalytics } from "../lib/student-success-analytics";
import NexusChat from "../components/NexusChat";

const supabase = createSupabaseBrowserClient();

type SkillGap = {
  skill: string;
  gap: number;
  readiness: number;
  status: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [careerName, setCareerName] = useState("");
  const [readiness, setReadiness] = useState(0);
  const [futureReadiness, setFutureReadiness] = useState(0);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [topSkills, setTopSkills] = useState<SkillGap[]>([]);
  const [scenario, setScenario] = useState("Consistent Growth");
  const [aiResult, setAiResult] = useState<NexusAIResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [geminiReport, setGeminiReport] = useState("");
  const [geminiFallback, setGeminiFallback] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState("");
  const [learningProgressData, setLearningProgressData] =
    useState<LearningProgress>(EMPTY_LEARNING_PROGRESS);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setErrorMessage("");

      try {
        // 1. Require an authenticated student account.
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/student/login");
          return;
        }

        // 2. Read the student's personal profile.
        const storedStudent = localStorage.getItem(
          getStudentStorageKey(user.id, "student"),
        );
        const storedCareer = localStorage.getItem(
          getStudentStorageKey(user.id, "selected_career"),
        );
        const storedSimulation = localStorage.getItem(
          getStudentStorageKey(user.id, "simulation"),
        );

        if (!storedStudent) {
          router.replace("/analyze");
          return;
        }

        const profile = JSON.parse(storedStudent) as StudentProfile;

        // 3. Find the database student linked to this signed-in account.
        const { data: mapping, error: mappingError } = await supabase
          .from("student_users")
          .select("student_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (mappingError) {
          throw new Error(
            `Student mapping could not be loaded: ${mappingError.message}`,
          );
        }

        if (!mapping) {
          throw new Error(
            "Your student account is not linked to a student record. Please contact your faculty administrator.",
          );
        }

        // 4. Fetch the mapped student record, not a name-based match.
        const { data: studentRecord, error: studentError } = await supabase
          .from("students")
          .select("id, student_code, full_name, branch, year")
          .eq("id", mapping.student_id)
          .maybeSingle();

        if (studentError) {
          throw new Error(
            `Student record could not be loaded: ${studentError.message}`,
          );
        }

        if (!studentRecord) {
          throw new Error("Your linked student record could not be found.");
        }

        // 5. Load faculty-verified academic data.
        const { data: academicRecord, error: academicError } = await supabase
          .from("academic_records")
          .select(
            "attendance_percentage, marks_percentage, assignment_completion_percentage",
          )
          .eq("student_id", studentRecord.id)
          .maybeSingle();

        if (academicError) {
          throw new Error(
            `Academic data could not be loaded: ${academicError.message}`,
          );
        }

        const verifiedProfile: StudentProfile = {
          ...profile,
          name: studentRecord.full_name,
          branch: studentRecord.branch,
          year: studentRecord.year,
          attendance: academicRecord?.attendance_percentage ?? undefined,
          marks: academicRecord?.marks_percentage ?? undefined,
          assignmentCompletion:
            academicRecord?.assignment_completion_percentage ?? undefined,
        };

        if (cancelled) return;

        setStudent(verifiedProfile);

        // 6. Load the selected career.
        if (!storedCareer) {
          router.replace("/career");
          return;
        }

        const career = getCareerByName(storedCareer);

        if (!career) {
          router.replace("/career");
          return;
        }

        setCareerName(career.name);
        setLearningProgressData(
          loadLearningProgress(window.localStorage, user.id),
        );

        // 7. Calculate career readiness and skill gaps.
        const gaps = getSkillGaps(verifiedProfile, career);
        const currentReadiness = getOverallReadiness(verifiedProfile, career);

        setReadiness(currentReadiness);

        const sortedGaps = [...gaps].sort((a, b) => b.gap - a.gap).slice(0, 3);

        setTopSkills(sortedGaps);

        // 8. Restore saved simulation data, if available.
        let simulatedFutureReadiness = currentReadiness;
        let savedScenario = "Consistent Growth";

        if (storedSimulation) {
          try {
            const simulationData = JSON.parse(storedSimulation);

            if (typeof simulationData.futureReadiness === "number") {
              simulatedFutureReadiness = Math.max(
                0,
                Math.min(100, simulationData.futureReadiness),
              );
            }

            if (typeof simulationData.scenario === "string") {
              savedScenario = simulationData.scenario;
            }
          } catch {
            console.warn("Could not read saved simulation data.");
          }
        }

        setFutureReadiness(simulatedFutureReadiness);
        setScenario(savedScenario);

        // 9. Generate NEXUS analysis and recommendations.
        setAiResult(analyzeStudentWithNexusAI(verifiedProfile));

        const result = getRecommendations({
          student: verifiedProfile,
          career,
          skillGaps: gaps,
          readiness: currentReadiness,
          futureReadiness: simulatedFutureReadiness,
          scenario: savedScenario,
        });

        setRecommendations(result.slice(0, 3));
      } catch (error) {
        console.error("Dashboard loading failed:", error);

        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load your dashboard.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-5">
        <div className="text-center">
          <div className="text-5xl mb-5">ðŸ§ </div>
          <h1 className="text-2xl font-bold">Building Your Dashboard...</h1>
          <p className="text-slate-400 mt-3">
            Loading your student intelligence profile.
          </p>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-5 py-12">
        <div className="max-w-2xl mx-auto rounded-2xl border border-red-500/30 bg-slate-900 p-7">
          <h1 className="text-2xl font-bold">Dashboard unavailable</h1>
          <p className="text-red-300 mt-4">{errorMessage}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950"
          >
            Return Home
          </button>
        </div>
      </main>
    );
  }

  const growth = Math.max(0, futureReadiness - readiness);
  const learningRoadmap = careerName ? getCareerRoadmap(careerName) : [];
  const learningSummary = computeLearningSummary(
    learningRoadmap,
    learningProgressData,
  );
  const successAnalytics = calculateStudentSuccessAnalytics({
    marksPercentage: student?.marks,
    attendancePercentage: student?.attendance,
    assignmentCompletionPercentage: student?.assignmentCompletion,
  });

  async function generateGeminiReport() {
    if (!student || !aiResult || geminiLoading) return;

    setGeminiLoading(true);
    setGeminiError("");

    try {
      const response = await fetch("/api/nexus-explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: student, analysis: aiResult }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to generate AI report.");
      }

      if (typeof data.explanation !== "string" || !data.explanation.trim()) {
        throw new Error("The AI report was empty. Please try again.");
      }

      setGeminiReport(data.explanation);
      setGeminiFallback(data.fallback === true);
    } catch (error) {
      setGeminiError(
        error instanceof Error
          ? error.message
          : "Unable to generate the AI report.",
      );
    } finally {
      setGeminiLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-5 py-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">
          <div>
            <p className="text-cyan-400 uppercase tracking-widest text-xs font-semibold">
              NEXUS â€¢ Student Intelligence
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mt-2">
              Welcome back{student?.name ? `, ${student.name}` : ""}
            </h1>
            <p className="text-slate-400 mt-3">
              Your personalized student future intelligence dashboard.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {student?.branch} Â· Year {student?.year}
            </p>
          </div>

          <button
            onClick={() => router.push("/analyze")}
            className="px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-900 transition font-semibold"
          >
            Update Analysis
          </button>
        </header>

        {/* CAREER AND READINESS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">
            <p className="text-sm text-slate-500 uppercase tracking-wide">
              Target Career
            </p>
            <h2 className="text-2xl font-bold mt-3">{careerName}</h2>
            <p className="text-slate-400 mt-3 leading-6">
              Your selected career path based on your profile and skill
              development.
            </p>
            <button
              onClick={() => router.push("/career")}
              className="mt-6 text-cyan-400 font-semibold hover:text-cyan-300"
            >
              Review Career â†’
            </button>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">
            <p className="text-sm text-slate-400">Current Readiness</p>
            <p className="text-5xl font-bold mt-3">{readiness}%</p>
            <div className="h-2 bg-slate-800 rounded-full mt-5 overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full"
                style={{ width: `${readiness}%` }}
              />
            </div>
            <p className="text-sm text-slate-500 mt-4">
              Your current career readiness level.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">
            <p className="text-sm text-slate-400">Future Simulation</p>
            <p className="text-5xl font-bold mt-3">{futureReadiness}%</p>
            <p className="text-emerald-400 font-semibold mt-3">
              +{growth}% potential growth
            </p>
            <p className="text-sm text-slate-500 mt-2">{scenario}</p>
          </div>
        </section>

        <section className="mb-10" aria-labelledby="success-score-heading">
          <div className="mb-5">
            <p className="text-cyan-400 text-sm font-semibold uppercase tracking-wide">
              Decision intelligence · prototype
            </p>
            <h2 id="success-score-heading" className="mt-1 text-3xl font-bold">
              Student Success Score
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
              A configurable heuristic from faculty-reported marks, overall
              attendance, and assignment completion. It is not a validated
              prediction. Learning completion, quiz results, and career
              readiness remain separate metrics.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-cyan-400/20 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">Coverage-aware score</p>
              <p className="mt-2 text-4xl font-bold">
                {successAnalytics.successScore === null
                  ? "Insufficient data"
                  : `${successAnalytics.successScore}/100`}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {successAnalytics.dataCoveragePercentage}% of weighted
                categories available · minimum{" "}
                {successAnalytics.minimumCoveragePercentage}%
              </p>
              <p className="mt-3 text-xs text-slate-500">
                {successAnalytics.reliabilityStatus}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">
                Overall intervention priority
              </p>
              <p className="mt-2 text-3xl font-bold">
                {successAnalytics.riskLevel}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {successAnalytics.riskCoveragePercentage}% of risk indicators
                available. Missing backlog and placement assessments can keep
                the overall priority insufficient.
              </p>
              {successAnalytics.riskFlags.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {successAnalytics.riskFlags.map((flag) => (
                    <li key={flag.key} className="text-sm text-amber-200">
                      {flag.level}: {flag.explanation}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-400">
                  No configured concern threshold is crossed in the available
                  measures.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">Evidence-based support</p>
              {successAnalytics.interventions.length > 0 ? (
                <ul className="mt-3 space-y-3">
                  {successAnalytics.interventions.map((item) => (
                    <li key={item.key}>
                      <p className="font-medium text-slate-200">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {item.rationale}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  No intervention is recommended from the currently observed
                  thresholds.
                </p>
              )}
            </div>
          </div>

          <details className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-cyan-300">
              Score component breakdown
            </summary>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {successAnalytics.includedCategories.map((category) => (
                <li key={category.key} className="text-sm text-slate-300">
                  {category.label}: {category.observedScore}% · weight{" "}
                  {category.weight}% · contribution {category.contribution}
                </li>
              ))}
            </ul>
            {successAnalytics.missingCategories.length > 0 && (
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Not included because data is unavailable:{" "}
                {successAnalytics.missingCategories.join(", ")}.
              </p>
            )}
            {successAnalytics.dataQualityIssues.length > 0 && (
              <p className="mt-2 text-xs text-amber-200">
                Data quality: {successAnalytics.dataQualityIssues.join(" ")}
              </p>
            )}
          </details>
        </section>

        <section className="mb-10" aria-labelledby="learning-progress-heading">
          <div className="mb-5">
            <p className="text-cyan-400 text-sm font-semibold uppercase tracking-wide">
              Learning activity
            </p>
            <h2
              id="learning-progress-heading"
              className="mt-1 text-3xl font-bold"
            >
              Roadmap progress
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Completion, quiz results, and quiz-threshold evidence are separate
              measures. Quiz scores are not a guarantee of real-world mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Learning completion</p>
              <p className="mt-2 text-3xl font-bold">
                {learningSummary.completionPercentage}%
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {learningSummary.totalSubtopics === 0
                  ? "No learning steps available"
                  : `${learningSummary.completedSubtopics} of ${learningSummary.totalSubtopics} steps complete`}
              </p>
              <div
                className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"
                role="progressbar"
                aria-label="Learning completion"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={learningSummary.completionPercentage}
              >
                <div
                  className="h-full rounded-full bg-cyan-400"
                  style={{ width: `${learningSummary.completionPercentage}%` }}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">
                Average sample quiz score
              </p>
              <p className="mt-2 text-3xl font-bold">
                {learningSummary.quizScorePercentage === null
                  ? "Not assessed yet"
                  : `${learningSummary.quizScorePercentage}%`}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {learningSummary.assessedTopics} topic
                {learningSummary.assessedTopics === 1 ? "" : "s"} assessed
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">
                Topics meeting 80% quiz threshold
              </p>
              <p className="mt-2 text-3xl font-bold">
                {learningSummary.assessedTopics === 0
                  ? "Not assessed yet"
                  : `${learningSummary.topicsMeetingQuizThreshold}/${learningSummary.assessedTopics}`}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Practice evidence only; not a mastery guarantee
              </p>
            </div>
          </div>

          {learningRoadmap.length === 0 ? (
            <p className="mt-6 rounded-xl border border-white/10 p-5 text-sm text-slate-400">
              No roadmap topics are available yet.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {learningRoadmap.map((phase, phaseIndex) => {
                const phaseSummary = learningSummary.phaseProgress[phaseIndex];

                return (
                  <section
                    key={phase.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-semibold">
                          Phase {phaseIndex + 1}: {phase.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {phaseSummary.completed} of {phaseSummary.total}{" "}
                          learning steps complete · {phaseSummary.percentage}%
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">
                        {phase.duration}
                      </span>
                    </div>
                    <ul className="mt-4 divide-y divide-white/5">
                      {phase.topics.map((topic) => {
                        const completedCount = topic.subtopics.filter(
                          (subtopic) =>
                            learningProgressData.completedSubtopics.includes(
                              subtopic.id,
                            ),
                        ).length;
                        const topicQuiz =
                          learningProgressData.quizResults[topic.id];
                        const status =
                          completedCount === topic.subtopics.length
                            ? "Complete"
                            : completedCount > 0
                              ? "In progress"
                              : "Not started";

                        return (
                          <li
                            key={topic.id}
                            className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="break-words text-sm text-slate-200">
                                {topic.title}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {status} · {completedCount}/
                                {topic.subtopics.length} steps
                              </p>
                            </div>
                            <p className="shrink-0 text-xs text-slate-500">
                              {topicQuiz
                                ? `Latest sample quiz: ${topicQuiz.score}/${topicQuiz.total}`
                                : "Quiz: Not assessed yet"}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Learning progress and sample quiz results are stored in this browser
            only. They are not synced across devices.
          </p>
        </section>

        {/* VERIFIED ACADEMIC DATA */}
        <section className="mb-10">
          <div className="mb-5">
            <p className="text-cyan-400 text-sm font-semibold uppercase tracking-wide">
              Verified Academic Intelligence
            </p>
            <h2 className="text-3xl font-bold mt-1">
              Faculty-Verified Performance
            </h2>
            <p className="text-slate-500 mt-2">
              Academic data maintained by authorized faculty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                label: "Attendance",
                value: student?.attendance,
              },
              {
                label: "Academic Marks",
                value: student?.marks,
              },
              {
                label: "Assignment Completion",
                value: student?.assignmentCompletion,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="text-4xl font-bold mt-3">
                  {item.value != null ? `${item.value}%` : "Not available"}
                </p>
                <p
                  className={`text-xs mt-3 ${
                    item.value != null ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {item.value != null
                    ? "âœ“ Faculty-verified"
                    : "No verified record available"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* NEXUS AI OVERVIEW */}
        <section className="mb-10">
          <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-7">
            <p className="text-cyan-400 uppercase tracking-widest text-xs font-bold">
              NEXUS AI
            </p>
            <h2 className="text-3xl font-bold mt-2">
              Student Intelligence Analysis
            </h2>
            <p className="text-slate-400 mt-3">
              Analysis of your career readiness, skill risks, and future
              potential based on the current profile.
            </p>

            {aiResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                {[
                  {
                    label: "Career Readiness",
                    value: aiResult.careerReadiness,
                  },
                  { label: "Skill Risk", value: aiResult.skillRisk },
                  {
                    label: "Future Readiness",
                    value: aiResult.futureReadiness,
                  },
                  {
                    label: "Career Confidence",
                    value: aiResult.careerConfidence,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-slate-950/70 border border-slate-800 p-5"
                  >
                    <p className="text-xs text-slate-500 uppercase">
                      {item.label}
                    </p>
                    <p className="text-4xl font-bold mt-2">{item.value}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {[
            {
              icon: "ðŸ”®",
              title: "Future Simulation",
              description:
                "Explore how different learning paths can affect your future readiness.",
              route: "/simulation",
              action: "Explore â†’",
            },
            {
              icon: "ðŸ’¡",
              title: "AI Recommendations",
              description:
                "View personalized actions based on your career and skill gaps.",
              route: "/recommendations",
              action: "View Recommendations â†’",
            },
            {
              icon: "ðŸ—ºï¸",
              title: "Personalized Roadmap",
              description:
                "Follow your structured learning and project development path.",
              route: "/roadmap",
              action: "Open Roadmap â†’",
            },
          ].map((item) => (
            <button
              key={item.route}
              onClick={() => router.push(item.route)}
              className="text-left rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-cyan-500/50 transition"
            >
              <div className="text-3xl">{item.icon}</div>
              <h3 className="text-xl font-bold mt-4">{item.title}</h3>
              <p className="text-slate-400 mt-2 text-sm leading-6">
                {item.description}
              </p>
              <span className="text-cyan-400 text-sm font-semibold block mt-4">
                {item.action}
              </span>
            </button>
          ))}
        </section>

        {/* TOP SKILL GAPS */}
        <section className="mb-10">
          <div className="mb-5">
            <p className="text-cyan-400 text-sm font-semibold uppercase tracking-wide">
              Skill Intelligence
            </p>
            <h2 className="text-3xl font-bold mt-1">Top Skill Gaps</h2>
            <p className="text-slate-500 mt-2">
              Areas that can have the biggest impact on your selected career.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {topSkills.length === 0 ? (
              <p className="text-slate-400">
                No skill-gap data is available yet.
              </p>
            ) : (
              topSkills.map((item) => (
                <div
                  key={item.skill}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-lg">{item.skill}</h3>
                    <span className="text-xs px-3 py-1 rounded-full bg-red-500/10 text-red-400">
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Readiness</span>
                      <span>{item.readiness}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full"
                        style={{
                          width: `${item.readiness}%`,
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mt-4">
                    Gap: {item.gap}%
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* NEXUS AI INSIGHTS */}
        {aiResult && (
          <section className="mb-10">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">
              <p className="text-cyan-400 text-sm font-semibold uppercase tracking-wide">
                NEXUS Intelligence
              </p>
              <h2 className="text-3xl font-bold mt-2">What NEXUS Sees</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-7">
                <div>
                  <p className="text-slate-500 text-sm">AI Career Direction</p>
                  <p className="text-xl font-bold mt-2">
                    {aiResult.bestCareer}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 text-sm">Priority Risk Skills</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {aiResult.topRiskSkills.length > 0 ? (
                      aiResult.topRiskSkills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-sm"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-emerald-400">
                        No major skill risks
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-slate-500 text-sm">Detected Strengths</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {aiResult.strengths.length > 0 ? (
                      aiResult.strengths.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500">Building evidence</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-slate-500 text-sm mb-3">
                  NEXUS Recommended Actions
                </p>
                <div className="space-y-3">
                  {aiResult.nextActions.map((action, index) => (
                    <div
                      key={`${action}-${index}`}
                      className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <span className="text-cyan-400 font-bold mr-2">
                        {index + 1}.
                      </span>
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <NexusChat careerName={careerName} skillGaps={topSkills} />

        {/* GEMINI AI REPORT */}
        <section className="mb-10">
          <div className="rounded-3xl border border-violet-500/30 bg-violet-500/5 p-7">
            <p className="text-violet-300 text-xs font-bold uppercase tracking-widest">
              Powered by Gemini
            </p>
            <h2 className="text-3xl font-bold mt-2">
              Your Personalized AI Report
            </h2>
            <p className="text-slate-400 mt-3 leading-7">
              Generate a personalized assessment, skill-gap explanation, and
              practical 30-day improvement plan using your current NEXUS profile
              and analysis.
            </p>
            <button
              onClick={generateGeminiReport}
              disabled={geminiLoading || !student || !aiResult}
              className="mt-6 rounded-xl bg-violet-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {geminiLoading
                ? "Generating Your Report..."
                : geminiReport
                  ? "Regenerate AI Report"
                  : "Generate AI Report"}
            </button>
            {geminiError && (
              <p className="mt-4 text-sm text-red-300">{geminiError}</p>
            )}
            {geminiReport && (
              <article className="mt-7 rounded-2xl border border-slate-700 bg-slate-950 p-5 sm:p-7">
                <h3 className="text-xl font-bold mb-4">
                  NEXUS Student Intelligence Report
                </h3>
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {geminiFallback
                    ? "Deterministic NEXUS fallback"
                    : "Gemini-generated report"}
                </p>
                <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                  {geminiReport}
                </div>
              </article>
            )}
          </div>
        </section>

        {/* PERSONALIZED RECOMMENDATIONS */}
        <section className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
            <div>
              <p className="text-cyan-400 text-sm font-semibold uppercase tracking-wide">
                Personalized Actions
              </p>
              <h2 className="text-3xl font-bold mt-1">
                What You Should Do Next
              </h2>
            </div>
            <button
              onClick={() => router.push("/recommendations")}
              className="text-cyan-400 font-semibold"
            >
              View All â†’
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recommendations.map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <span className="text-xs uppercase tracking-wide text-cyan-400 font-semibold">
                  {item.category}
                </span>
                <h3 className="text-lg font-bold mt-3">{item.title}</h3>
                <p className="text-sm text-slate-400 mt-3 leading-6">
                  {item.description}
                </p>
                <div className="mt-4 text-sm text-slate-300">
                  <span className="text-slate-500">Next:</span> {item.action}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-8 md:p-10 text-center">
          <p className="text-cyan-400 uppercase tracking-wide text-sm font-semibold">
            Keep Building Your Future
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mt-3">
            Your future is a path, not a prediction.
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto mt-4 leading-7">
            NEXUS helps you understand your current position, identify skill
            risks, explore future possibilities, and continuously improve.
          </p>
          <button
            onClick={() => router.push("/roadmap")}
            className="mt-7 px-7 py-3 rounded-xl bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 transition"
          >
            Continue My Roadmap â†’
          </button>
        </section>

        <footer className="text-center text-xs text-slate-600 mt-10">
          NEXUS â€¢ AI Student Future Simulator
        </footer>
      </div>
    </main>
  );
}
