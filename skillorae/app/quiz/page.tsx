"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadLearningProgress,
  saveLearningProgress,
  withQuizResult,
  type LearningProgress,
} from "../lib/learning-progress";
import {
  getCareerRoadmap,
  getSampleQuiz,
  type SampleQuizQuestion,
} from "../lib/roadmap-content";
import {
  getAuthenticatedUserId,
  getStudentStorageKey,
} from "../lib/student-storage";

export default function QuizPage() {
  const router = useRouter();
  const submissionStarted = useRef(false);
  const [userId, setUserId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [questions, setQuestions] = useState<SampleQuizQuestion[]>([]);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadQuiz() {
      try {
        const authenticatedUserId = await getAuthenticatedUserId();
        if (!authenticatedUserId) {
          router.replace("/student/login");
          return;
        }

        const careerName = localStorage.getItem(
          getStudentStorageKey(authenticatedUserId, "selected_career"),
        );
        const requestedTopicId = new URLSearchParams(
          window.location.search,
        ).get("topic");
        const topic = careerName
          ? getCareerRoadmap(careerName)
              .flatMap((phase) => phase.topics)
              .find((item) => item.id === requestedTopicId)
          : undefined;

        if (!topic) {
          if (!cancelled) {
            setError(
              "That topic is unavailable. Open a topic from your roadmap to start its quiz.",
            );
          }
          return;
        }

        if (!cancelled) {
          setUserId(authenticatedUserId);
          setTopicId(topic.id);
          setTopicTitle(topic.title);
          setQuestions(getSampleQuiz(topic.title));
          setProgress(
            loadLearningProgress(window.localStorage, authenticatedUserId),
          );
        }
      } catch {
        if (!cancelled)
          setError(
            "The quiz could not be loaded. Please return to your roadmap and try again.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadQuiz();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function submitQuiz(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionStarted.current || score !== null || !progress) return;

    if (Object.keys(answers).length !== questions.length) {
      setError("Choose an answer for every question before submitting.");
      return;
    }

    submissionStarted.current = true;
    setError("");
    const correctAnswers = questions.reduce(
      (count, question, index) =>
        count + (answers[index] === question.correctIndex ? 1 : 0),
      0,
    );
    const updatedProgress = withQuizResult(progress, topicId, {
      score: correctAnswers,
      total: questions.length,
      submittedAt: new Date().toISOString(),
    });

    setScore(correctAnswers);
    setProgress(updatedProgress);
    setSaveNotice(
      saveLearningProgress(window.localStorage, userId, updatedProgress)
        ? "Result saved in this browser only; it will not sync across devices."
        : "The result is shown here, but could not be saved in this browser.",
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        <p role="status" className="text-slate-300">
          Loading topic quiz...
        </p>
      </main>
    );
  }

  const currentQuestion = questions[questionIndex];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
              NEXUS · Topic practice
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              {topicTitle || "Sample quiz"}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/roadmap")}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            Back to roadmap
          </button>
        </header>

        {error && (
          <p
            role="alert"
            className="mb-5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
          >
            {error}
          </p>
        )}

        {questions.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-8">
            <div className="mb-6 border-b border-white/10 pb-5">
              <p className="text-sm leading-6 text-slate-300">
                Static sample questions about practicing this topic. They are
                not AI-generated and do not establish real-world mastery.
              </p>
              <p className="mt-3 text-xs text-slate-500" aria-live="polite">
                Question {questionIndex + 1} of {questions.length} ·{" "}
                {Object.keys(answers).length} answered
              </p>
              <nav
                className="mt-4 flex flex-wrap gap-2"
                aria-label="Question navigation"
              >
                {questions.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Go to question ${index + 1}`}
                    aria-current={questionIndex === index ? "step" : undefined}
                    onClick={() => setQuestionIndex(index)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${questionIndex === index ? "border-cyan-400 bg-cyan-400 text-slate-950" : answers[index] !== undefined ? "border-emerald-400/40 text-emerald-200" : "border-white/15 text-slate-300 hover:bg-white/5"}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </nav>
            </div>

            {score === null && currentQuestion ? (
              <form onSubmit={submitQuiz}>
                <fieldset>
                  <legend className="text-lg font-semibold leading-7 sm:text-xl">
                    {currentQuestion.prompt}
                  </legend>
                  <div className="mt-5 space-y-3">
                    {currentQuestion.options.map((option, optionIndex) => (
                      <label
                        key={option}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-6 transition focus-within:outline focus-within:outline-2 focus-within:outline-cyan-400 ${answers[questionIndex] === optionIndex ? "border-cyan-400/60 bg-cyan-400/10 text-white" : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-white/20"}`}
                      >
                        <input
                          type="radio"
                          name={`question-${questionIndex}`}
                          checked={answers[questionIndex] === optionIndex}
                          onChange={() => {
                            setAnswers((previous) => ({
                              ...previous,
                              [questionIndex]: optionIndex,
                            }));
                            setError("");
                          }}
                          className="mt-1 h-4 w-4 shrink-0 accent-cyan-400"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    disabled={questionIndex === 0}
                    onClick={() =>
                      setQuestionIndex((index) => Math.max(0, index - 1))
                    }
                    className="rounded-lg border border-white/15 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  {questionIndex < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setQuestionIndex((index) =>
                          Math.min(questions.length - 1, index + 1),
                        )
                      }
                      className="rounded-lg bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                    >
                      Next question
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="rounded-lg bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                    >
                      Submit sample quiz
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div>
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] p-5">
                  <p className="text-sm text-slate-300">Sample quiz score</p>
                  <p className="mt-1 text-4xl font-bold">
                    {score}/{questions.length}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    This is a small practice check, not a guarantee of
                    real-world skill or mastery.
                  </p>
                  <p role="status" className="mt-3 text-xs text-slate-500">
                    {saveNotice}
                  </p>
                </div>
                <h2 className="mt-7 text-lg font-semibold">Answer review</h2>
                <ol className="mt-3 space-y-4">
                  {questions.map((question, index) => {
                    const correct = answers[index] === question.correctIndex;

                    return (
                      <li
                        key={question.prompt}
                        className="rounded-xl border border-white/10 p-4"
                      >
                        <p className="font-medium">
                          {index + 1}. {question.prompt}
                        </p>
                        <p
                          className={`mt-2 text-sm ${correct ? "text-emerald-300" : "text-rose-200"}`}
                        >
                          {correct ? "Correct" : "Review this answer"}:{" "}
                          {question.options[question.correctIndex]}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {question.explanation}
                        </p>
                      </li>
                    );
                  })}
                </ol>
                <button
                  type="button"
                  onClick={() => router.push("/roadmap")}
                  className="mt-6 rounded-lg bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                >
                  Return to roadmap
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
