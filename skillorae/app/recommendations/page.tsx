"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAuthenticatedUserId,
  getStudentStorageKey,
} from "../lib/student-storage";

import {
  getCareerByName,
  getCareerMatches,
  getSkillGaps,
  getOverallReadiness,
  StudentProfile,
} from "../lib/career-engine";

import {
  getRecommendations,
  Recommendation,
} from "../lib/recommendation-engine";

export default function RecommendationsPage() {
  const router = useRouter();

  const [careerName, setCareerName] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [readiness, setReadiness] = useState(0);
  const [futureReadiness, setFutureReadiness] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecommendations() {
      const userId = await getAuthenticatedUserId();

      if (!userId) {
        router.replace("/student/login");
        setLoading(false);
        return;
      }

      const storageKey = (item: "student" | "selected_career" | "simulation") =>
        getStudentStorageKey(userId, item);

      try {
        const storedStudent = localStorage.getItem(storageKey("student"));
        const storedCareer = localStorage.getItem(
          storageKey("selected_career"),
        );
        const storedSimulation = localStorage.getItem(storageKey("simulation"));

        if (!storedStudent) {
          router.push("/analyze");
          return;
        }

        const profile = JSON.parse(storedStudent) as StudentProfile;

        // -----------------------------------------
        // Find selected career
        // -----------------------------------------

        let selectedCareer = storedCareer || "";

        if (!selectedCareer) {
          const matches = getCareerMatches(profile);

          if (matches.length === 0) {
            router.push("/career");
            return;
          }

          selectedCareer = matches[0].career.name;

          localStorage.setItem(storageKey("selected_career"), selectedCareer);
        }

        // -----------------------------------------
        // Get career object
        // -----------------------------------------

        let career = getCareerByName(selectedCareer);

        // -----------------------------------------
        // Safety fallback for old/invalid data
        // -----------------------------------------

        if (!career) {
          localStorage.removeItem(storageKey("selected_career"));

          const matches = getCareerMatches(profile);

          if (matches.length === 0) {
            router.push("/career");
            return;
          }

          career = matches[0].career;

          selectedCareer = career.name;

          localStorage.setItem(storageKey("selected_career"), selectedCareer);
        }

        setCareerName(career.name);

        // -----------------------------------------
        // Calculate skill gaps
        // -----------------------------------------

        const gaps = getSkillGaps(profile, career);

        // -----------------------------------------
        // IMPORTANT:
        // getOverallReadiness expects STUDENT + CAREER
        // -----------------------------------------

        const currentReadiness = getOverallReadiness(profile, career);

        setReadiness(currentReadiness);

        // -----------------------------------------
        // Read simulation data
        // -----------------------------------------

        let simulatedFutureReadiness = currentReadiness;

        let scenario = "Consistent Growth";

        if (storedSimulation) {
          try {
            const simulationData = JSON.parse(storedSimulation);

            if (typeof simulationData.futureReadiness === "number") {
              simulatedFutureReadiness = simulationData.futureReadiness;
            }

            if (typeof simulationData.scenario === "string") {
              scenario = simulationData.scenario;
            }
          } catch {
            console.warn("Could not read saved simulation data.");
          }
        }

        setFutureReadiness(simulatedFutureReadiness);

        // -----------------------------------------
        // Generate recommendations
        // -----------------------------------------

        const result = getRecommendations({
          student: profile,
          career,
          skillGaps: gaps,
          readiness: currentReadiness,
          futureReadiness: simulatedFutureReadiness,
          scenario,
        });

        setRecommendations(result);
      } catch (error) {
        console.error("Recommendation page error:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadRecommendations();
  }, [router]);

  // -----------------------------------------
  // Loading screen
  // -----------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-5xl mb-5">🧠</div>

          <h1 className="text-2xl font-bold">
            Building Your Recommendations...
          </h1>

          <p className="text-slate-400 mt-3">
            Analyzing your career path and skill gaps.
          </p>
        </div>
      </main>
    );
  }

  // -----------------------------------------
  // Summary calculations
  // -----------------------------------------

  const highPriority = recommendations.filter(
    (item) => item.priority === "High",
  ).length;

  const growth = Math.max(0, futureReadiness - readiness);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-5 py-10">
      <div className="max-w-6xl mx-auto">
        {/* ======================================
            HEADER
        ====================================== */}

        <div className="mb-10">
          <button
            onClick={() => router.push("/simulation")}
            className="text-sm text-slate-400 hover:text-white transition mb-6"
          >
            ← Back to Future Simulation
          </button>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-cyan-400 font-semibold tracking-wide uppercase text-sm">
                Personalized Intelligence
              </p>

              <h1 className="text-4xl md:text-5xl font-bold mt-2">
                Your Recommendations
              </h1>

              <p className="text-slate-400 mt-3 max-w-2xl leading-7">
                Personalized actions based on your selected career, current
                skill gaps, readiness and future growth scenario.
              </p>
            </div>

            {/* Target Career */}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 min-w-[220px]">
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Target Career
              </p>

              <p className="text-lg font-semibold mt-1">{careerName}</p>
            </div>
          </div>
        </div>

        {/* ======================================
            READINESS SUMMARY
        ====================================== */}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {/* Current Readiness */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Current Readiness</p>

            <p className="text-4xl font-bold mt-2">{readiness}%</p>

            <div className="h-2 bg-slate-800 rounded-full mt-4 overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-700"
                style={{
                  width: `${readiness}%`,
                }}
              />
            </div>
          </div>

          {/* Future Readiness */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Simulated Future Readiness</p>

            <p className="text-4xl font-bold mt-2">{futureReadiness}%</p>

            <p className="text-sm text-emerald-400 mt-3">
              +{growth}% potential growth
            </p>
          </div>

          {/* High Priority Actions */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">High Priority Actions</p>

            <p className="text-4xl font-bold mt-2">{highPriority}</p>

            <p className="text-sm text-slate-500 mt-3">
              Focus on these first for maximum impact.
            </p>
          </div>
        </section>

        {/* ======================================
            ACTION PLAN
        ====================================== */}

        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Action Plan</h2>

            <p className="text-slate-500 mt-1">
              What SKILLORAE recommends you do next.
            </p>
          </div>

          {recommendations.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
              <div className="text-4xl mb-4">🧭</div>

              <p className="text-slate-400">
                No recommendations were generated yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {recommendations.map((item, index) => (
                <div
                  key={`${item.title}-${index}`}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-slate-600 transition"
                >
                  {/* Card Header */}

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs uppercase tracking-wide text-cyan-400 font-semibold">
                        {item.category}
                      </span>

                      <h3 className="text-xl font-bold mt-2">{item.title}</h3>
                    </div>

                    {/* Priority Badge */}

                    <span
                      className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
                        item.priority === "High"
                          ? "bg-red-500/10 text-red-400"
                          : item.priority === "Medium"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {item.priority}
                    </span>
                  </div>

                  {/* Description */}

                  <p className="text-slate-400 mt-4 leading-7">
                    {item.description}
                  </p>

                  {/* Next Action */}

                  <div className="mt-5 rounded-xl bg-slate-950 border border-slate-800 p-4">
                    <p className="text-xs uppercase text-slate-500 font-semibold">
                      Next Action
                    </p>

                    <p className="text-sm text-slate-200 mt-2 leading-6">
                      {item.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ======================================
            ROADMAP CTA
        ====================================== */}

        <section className="mt-10 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-8 text-center">
          <p className="text-cyan-400 text-sm font-semibold uppercase tracking-wide">
            Ready for the next step?
          </p>

          <h2 className="text-3xl font-bold mt-2">
            Turn your recommendations into a roadmap.
          </h2>

          <p className="text-slate-400 mt-3 max-w-2xl mx-auto leading-7">
            Convert your priorities into a structured learning and project
            roadmap.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
            <button
              onClick={() => router.push("/roadmap")}
              className="px-6 py-3 rounded-xl bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 transition"
            >
              Build My Roadmap →
            </button>

            <button
              onClick={() => router.push("/career")}
              className="px-6 py-3 rounded-xl border border-slate-700 text-white font-semibold hover:bg-slate-900 transition"
            >
              Review Career
            </button>
          </div>
        </section>

        {/* ======================================
            FOOTER
        ====================================== */}

        <div className="text-center mt-10 text-xs text-slate-600">
          SKILLORAE • AI Student Future Simulator
        </div>
      </div>
    </main>
  );
}
