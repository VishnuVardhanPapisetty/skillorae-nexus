"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCareerByName,
  getCareerMatches,
  getSkillGaps,
  getOverallReadiness,
  StudentProfile,
} from "../lib/career-engine";
import {
  computeLearningSummary,
  EMPTY_LEARNING_PROGRESS,
  loadLearningProgress,
  saveLearningProgress,
  toggleSubtopic,
  type LearningProgress,
} from "../lib/learning-progress";
import { getCareerRoadmap } from "../lib/roadmap-content";
import {
  getAuthenticatedUserId,
  getStudentStorageKey,
} from "../lib/student-storage";

type SkillGap = {
  skill: string;
  readiness: number;
  gap: number;
  status: string;
};

export default function RoadmapPage() {
  const router = useRouter();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [careerName, setCareerName] = useState("");
  const [readiness, setReadiness] = useState(0);
  const [futureReadiness, setFutureReadiness] = useState(0);
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);
  const [activePhase, setActivePhase] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [progress, setProgress] = useState<LearningProgress>(
    EMPTY_LEARNING_PROGRESS,
  );
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);
  const [progressNotice, setProgressNotice] = useState("");

  useEffect(() => {
    async function loadRoadmap() {
      const userId = await getAuthenticatedUserId();

      if (!userId) {
        router.replace("/student/login");
        setLoading(false);
        return;
      }

      setUserId(userId);
      setProgress(loadLearningProgress(window.localStorage, userId));
      setProgressNotice(
        "Progress is saved in this browser only and does not sync across devices.",
      );

      const storedStudent = localStorage.getItem(
        getStudentStorageKey(userId, "student"),
      );
      const careerKey = getStudentStorageKey(userId, "selected_career");
      const storedCareer = localStorage.getItem(careerKey);
      const storedSimulation = localStorage.getItem(
        getStudentStorageKey(userId, "simulation"),
      );

      if (!storedStudent) {
        router.push("/analyze");
        setLoading(false);
        return;
      }

      try {
        const profile: StudentProfile = JSON.parse(storedStudent);

        let selectedCareerName = storedCareer;

        if (!selectedCareerName) {
          const matches = getCareerMatches(profile);

          if (matches.length > 0) {
            selectedCareerName = matches[0].career.name;

            localStorage.setItem(careerKey, selectedCareerName);
          }
        }

        if (!selectedCareerName) {
          router.push("/career");
          return;
        }

        const career = getCareerByName(selectedCareerName);

        if (!career) {
          router.push("/career");
          return;
        }

        const gaps = getSkillGaps(profile, career);
        const currentReadiness = getOverallReadiness(profile, career);

        let simulatedFuture = Math.min(
          100,
          Math.round(currentReadiness + (100 - currentReadiness) * 0.65),
        );

        if (storedSimulation) {
          try {
            const simulation = JSON.parse(storedSimulation);

            if (typeof simulation.futureReadiness === "number") {
              simulatedFuture = simulation.futureReadiness;
            }
          } catch {
            // Keep calculated value.
          }
        }

        setStudent(profile);
        setCareerName(career.name);
        setSkillGaps(gaps);
        setReadiness(currentReadiness);
        setFutureReadiness(simulatedFuture);
      } catch {
        router.push("/analyze");
      } finally {
        setLoading(false);
      }
    }

    void loadRoadmap();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold mb-3">SKILLORAE</div>

          <p className="text-slate-400">
            Building your personalized roadmap...
          </p>
        </div>
      </main>
    );
  }

  if (!student) {
    return null;
  }

  const roadmap = getCareerRoadmap(careerName);

  const prioritySkills = [...skillGaps]
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3)
    .map((item) => item.skill);

  const currentPhase = roadmap[activePhase];
  const learningSummary = computeLearningSummary(roadmap, progress);

  function updateProgress(next: LearningProgress) {
    setProgress(next);
    setProgressNotice(
      saveLearningProgress(window.localStorage, userId, next)
        ? "Progress is saved in this browser only and does not sync across devices."
        : "Progress could not be saved in this browser. Your changes may be lost when you leave.",
    );
  }

  function toggleTopic(topicId: string) {
    setExpandedTopics((previous) =>
      previous.includes(topicId)
        ? previous.filter((id) => id !== topicId)
        : [...previous, topicId],
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-xl font-bold tracking-wide"
          >
            SKILLORAE
          </button>

          <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Personalized Roadmap
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400 mb-3">
            Your Career Roadmap
          </p>

          <h1 className="text-4xl md:text-5xl font-bold">
            Build Your Path to{" "}
            <span className="text-cyan-400">{careerName}</span>
          </h1>

          <p className="text-slate-400 mt-4 max-w-2xl">
            A personalized learning path generated from your current skills,
            career target and future-readiness simulation.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-slate-400 mb-2">Student</p>

            <p className="text-xl font-semibold">{student.name}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-slate-400 mb-2">Target Career</p>

            <p className="text-xl font-semibold">{careerName}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-slate-400 mb-2">Readiness Growth</p>

            <p className="text-xl font-semibold">
              {readiness}%{" "}
              <span className="text-cyan-400">→ {futureReadiness}%</span>
            </p>
          </div>
        </div>

        <section
          className="mb-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-5 sm:p-6"
          aria-label="Learning progress"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Learning completion</p>
              <p className="mt-1 text-3xl font-bold">
                {learningSummary.completionPercentage}%
              </p>
            </div>
            <p className="text-sm text-slate-400">
              {learningSummary.completedSubtopics} of{" "}
              {learningSummary.totalSubtopics} learning steps complete
            </p>
          </div>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Overall learning completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={learningSummary.completionPercentage}
          >
            <div
              className="h-full rounded-full bg-cyan-400 transition-[width]"
              style={{ width: `${learningSummary.completionPercentage}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500" aria-live="polite">
            {progressNotice}
          </p>
        </section>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 mb-8">
          <p className="text-sm uppercase tracking-widest text-slate-400">
            Priority Skills
          </p>

          <p className="text-lg font-semibold mt-1 mb-4">
            Focus on these areas first
          </p>

          <div className="flex flex-wrap gap-2">
            {prioritySkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {roadmap.map((phase, index) => (
            <button
              key={phase.id}
              type="button"
              aria-pressed={activePhase === index}
              onClick={() => setActivePhase(index)}
              className={`rounded-2xl border p-5 text-left transition ${
                activePhase === index
                  ? "border-cyan-400/50 bg-cyan-400/10"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Phase {index + 1}
              </p>

              <p className="font-semibold mt-2">{phase.title}</p>

              <p className="text-xs text-slate-400 mt-2">{phase.duration}</p>
              <p className="text-xs text-cyan-300 mt-2">
                {learningSummary.phaseProgress[index]?.percentage ?? 0}%
                complete
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 md:p-9 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 mb-8">
            <div>
              <p className="text-sm uppercase tracking-widest text-cyan-400">
                Phase {activePhase + 1}
              </p>

              <h2 className="text-3xl font-bold mt-2">{currentPhase.title}</h2>

              <p className="text-slate-400 mt-2">{currentPhase.duration}</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs text-slate-500 uppercase tracking-widest">
                Objective
              </p>

              <p className="text-sm text-slate-200 mt-1 max-w-sm">
                {currentPhase.objective}
              </p>
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Topics</h3>
              <p className="mt-1 text-sm text-slate-400">
                {learningSummary.completedSubtopics} of{" "}
                {learningSummary.totalSubtopics} learning steps complete
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {currentPhase.topics.map((topic, index) => {
              const isExpanded = expandedTopics.includes(topic.id);
              const completedCount = topic.subtopics.filter((subtopic) =>
                progress.completedSubtopics.includes(subtopic.id),
              ).length;
              const topicStatus =
                completedCount === topic.subtopics.length
                  ? "Complete"
                  : completedCount > 0
                    ? "In progress"
                    : "Not started";
              const quizResult = progress.quizResults[topic.id];

              return (
                <section
                  key={topic.id}
                  className="overflow-hidden rounded-xl border border-white/10 bg-black/20"
                >
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`${topic.id}-details`}
                    onClick={() => toggleTopic(topic.id)}
                    className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 text-sm text-cyan-300">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-100">
                        {topic.title}
                      </span>
                      <span className="mt-1 block text-sm text-slate-400">
                        {topicStatus} · {completedCount}/
                        {topic.subtopics.length} steps
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-cyan-300">
                      {isExpanded ? "−" : "+"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div
                      id={`${topic.id}-details`}
                      className="border-t border-white/10 px-4 pb-4 pt-3 sm:ml-12"
                    >
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Learning steps
                      </h4>
                      <ul className="mt-2 space-y-2">
                        {topic.subtopics.map((subtopic) => {
                          const checked = progress.completedSubtopics.includes(
                            subtopic.id,
                          );

                          return (
                            <li key={subtopic.id}>
                              <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 text-sm text-slate-300 hover:bg-white/[0.04]">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    updateProgress(
                                      toggleSubtopic(progress, subtopic.id),
                                    )
                                  }
                                  className="mt-0.5 h-4 w-4 accent-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                                  aria-label={`${checked ? "Mark incomplete" : "Mark complete"}: ${subtopic.title}`}
                                />
                                <span className="min-w-0 flex-1">
                                  {subtopic.title}
                                  <span
                                    className={`ml-2 text-xs ${checked ? "text-emerald-300" : "text-slate-500"}`}
                                  >
                                    {checked ? "✓ Complete" : "Not started"}
                                  </span>
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-slate-500">
                          {quizResult
                            ? `Latest sample quiz: ${quizResult.score}/${quizResult.total}`
                            : "No quiz attempt yet"}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/quiz?topic=${encodeURIComponent(topic.id)}`,
                            )
                          }
                          className="rounded-lg border border-cyan-400/30 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                        >
                          {quizResult
                            ? "Retake sample quiz"
                            : "Take sample quiz"}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 md:p-9 mb-8">
          <p className="text-sm uppercase tracking-widest text-slate-400">
            Skill Progress Targets
          </p>

          <h2 className="text-2xl font-bold mt-2 mb-7">
            Move Your Skills Toward Career Readiness
          </h2>

          <div className="space-y-6">
            {skillGaps.map((item) => (
              <div key={item.skill}>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="font-medium">{item.skill}</p>

                    <p className="text-xs text-slate-500">{item.status}</p>
                  </div>

                  <p className="text-sm text-slate-400">
                    {item.readiness}% → 85%
                  </p>
                </div>

                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all"
                    style={{
                      width: `${Math.min(100, item.readiness)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.06] p-7 md:p-9">
          <p className="text-sm uppercase tracking-widest text-cyan-400">
            Final Recommendation
          </p>

          <h2 className="text-2xl md:text-3xl font-bold mt-3">
            Follow the roadmap consistently.
          </h2>

          <p className="text-slate-300 mt-4 max-w-3xl leading-7">
            Your roadmap is designed around your current readiness, priority
            skill gaps and selected career. Complete each phase, build practical
            projects and reassess your skills as you progress.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <button
              onClick={() => router.push("/simulation")}
              className="rounded-xl border border-white/10 px-6 py-3 font-medium hover:bg-white/10 transition"
            >
              ← Back to Simulation
            </button>

            <button
              onClick={() => router.push("/")}
              className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300 transition"
            >
              Finish Roadmap →
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        SKILLORAE • AI Student Future Simulator
      </footer>
    </main>
  );
}
