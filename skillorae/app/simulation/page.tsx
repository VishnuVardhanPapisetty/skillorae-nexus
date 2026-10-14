"use client";

import { useEffect, useMemo, useState } from "react";
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
  getAllCareers,
  StudentProfile,
} from "../lib/career-engine";

type ScenarioId = "skill" | "projects" | "academics" | "focus" | "career";

type Scenario = {
  id: ScenarioId;
  name: string;
  description: string;
  icon: string;
};

const scenarios: Scenario[] = [
  {
    id: "skill",
    name: "Improve My Biggest Skill Gap",
    description:
      "See how your readiness could change if you seriously improve your weakest priority skill.",
    icon: "🎯",
  },
  {
    id: "projects",
    name: "Build 3 Strong Projects",
    description:
      "Simulate the impact of completing three meaningful projects related to your target career.",
    icon: "🚀",
  },
  {
    id: "academics",
    name: "Improve My Academics",
    description:
      "See the estimated impact of improving marks, attendance and academic consistency.",
    icon: "📚",
  },
  {
    id: "focus",
    name: "Focus on My Career for 6 Months",
    description:
      "Simulate a focused six-month learning path around your selected career.",
    icon: "⚡",
  },
  {
    id: "career",
    name: "Choose a Different Career",
    description: "Explore how your current profile fits another career path.",
    icon: "🔀",
  },
];

export default function SimulationPage() {
  const router = useRouter();

  const [student, setStudent] = useState<StudentProfile | null>(null);

  const [careerName, setCareerName] = useState("");
  const [readiness, setReadiness] = useState(0);

  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>("skill");

  const [selectedAlternativeCareer, setSelectedAlternativeCareer] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    async function loadSimulation() {
      const authenticatedUserId = await getAuthenticatedUserId();

      if (!authenticatedUserId) {
        router.replace("/student/login");
        setLoading(false);
        return;
      }

      setUserId(authenticatedUserId);

      try {
        const storedStudent = localStorage.getItem(
          getStudentStorageKey(authenticatedUserId, "student"),
        );
        const careerKey = getStudentStorageKey(
          authenticatedUserId,
          "selected_career",
        );
        const storedCareer = localStorage.getItem(careerKey);

        if (!storedStudent) {
          router.push("/analyze");
          return;
        }

        const profile = JSON.parse(storedStudent) as StudentProfile;

        setStudent(profile);

        let selectedCareer = storedCareer || "";

        if (!selectedCareer) {
          const matches = getCareerMatches(profile);

          if (matches.length === 0) {
            router.push("/career");
            return;
          }

          selectedCareer = matches[0].career.name;

          localStorage.setItem(careerKey, selectedCareer);
        }

        let career = getCareerByName(selectedCareer);

        if (!career) {
          localStorage.removeItem(careerKey);

          const matches = getCareerMatches(profile);

          if (matches.length === 0) {
            router.push("/career");
            return;
          }

          career = matches[0].career;
          selectedCareer = career.name;

          localStorage.setItem(careerKey, selectedCareer);
        }

        setCareerName(career.name);

        const currentReadiness = getOverallReadiness(profile, career);

        setReadiness(Math.round(currentReadiness));
      } catch (error) {
        console.error("Simulation page error:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadSimulation();
  }, [router]);

  const career = useMemo(() => {
    if (!careerName) return null;

    return getCareerByName(careerName);
  }, [careerName]);

  const allCareers = useMemo(() => {
    return getAllCareers().filter((item) => item.name !== careerName);
  }, [careerName]);

  const prioritySkills = useMemo(() => {
    if (!student || !career) return [];

    const gaps = getSkillGaps(student, career);

    return [...gaps].sort((a, b) => b.gap - a.gap).slice(0, 3);
  }, [student, career]);

  const biggestGap = prioritySkills[0];

  const simulated = useMemo(() => {
    if (!student || !career) {
      return {
        futureReadiness: readiness,
        growth: 0,
        title: "No simulation available",
        explanation: "",
        actions: [] as string[],
        simulatedCareer: careerName,
      };
    }

    let future = readiness;
    let title = "";
    let explanation = "";
    let actions: string[] = [];
    let simulatedCareer = careerName;

    if (selectedScenario === "skill") {
      const skill = biggestGap?.skill;

      if (skill) {
        const currentSkillReadiness = biggestGap.readiness;

        const skillImprovement = Math.min(35, 90 - currentSkillReadiness);

        future = readiness + skillImprovement * 0.45;

        title = `What if you seriously improve ${skill}?`;

        explanation =
          `Your biggest current opportunity is ${skill}. ` +
          `If you improve this skill substantially, your estimated career readiness could increase because ${skill} is an important requirement for ${career.name}.`;

        actions = [
          `Move ${skill} from your current level toward Advanced.`,
          `Practice ${skill} consistently every week.`,
          `Build at least one practical project using ${skill}.`,
        ];
      }
    }

    if (selectedScenario === "projects") {
      future = readiness + Math.min(18, (100 - readiness) * 0.32);

      title = "What if you build 3 strong projects?";

      explanation =
        `Three meaningful projects can strengthen practical evidence for ${career.name}. ` +
        `NEXUS estimates an improvement because projects can convert learning into demonstrable skills and portfolio evidence.`;

      actions = [
        "Build Project 1 around your biggest skill gap.",
        "Build Project 2 around your target career.",
        "Build Project 3 as a larger end-to-end project.",
      ];
    }

    if (selectedScenario === "academics") {
      const currentMarks = student.marks ?? 50;

      const currentAttendance = student.attendance ?? 50;

      const currentAssignments = student.assignmentCompletion ?? 50;

      const academicAverage =
        (currentMarks + currentAttendance + currentAssignments) / 3;

      const academicImprovement = Math.max(0, 85 - academicAverage);

      future = readiness + Math.min(15, academicImprovement * 0.22);

      title = "What if you improve your academics?";

      explanation =
        "Better academic consistency can strengthen your overall student profile. NEXUS estimates the effect using your current marks, attendance and assignment completion.";

      actions = [
        "Improve your average marks.",
        "Maintain strong attendance.",
        "Complete assignments consistently.",
      ];
    }

    // ===== PART 2 STARTS HERE =====

    if (selectedScenario === "focus") {
      future = readiness + Math.min(25, (100 - readiness) * 0.48);

      title = `What if you focus on ${career.name} for 6 months?`;

      explanation = `A focused six-month learning cycle could improve multiple parts of your profile at once: skills, projects and career preparation. This is an estimated scenario, not a guaranteed prediction.`;

      actions = [
        "Follow a structured weekly learning plan.",
        "Strengthen your top priority skills.",
        "Build career-relevant projects.",
        "Track progress and update your NEXUS profile.",
      ];
    }

    if (selectedScenario === "career") {
      const alternative = getCareerByName(selectedAlternativeCareer);

      if (alternative) {
        const alternativeReadiness = getOverallReadiness(student, alternative);

        future = alternativeReadiness;

        simulatedCareer = alternative.name;

        title = `What if you choose ${alternative.name}?`;

        explanation = `Your current profile has an estimated readiness of ${Math.round(
          alternativeReadiness,
        )}% for ${alternative.name}. This lets you compare your current profile against another career path.`;

        const alternativeGaps = getSkillGaps(student, alternative);

        actions = alternativeGaps
          .sort((a, b) => b.gap - a.gap)
          .slice(0, 3)
          .map((gap) => `Improve ${gap.skill} (${gap.gap}% current gap).`);
      } else {
        title = "Choose another career to simulate.";

        explanation =
          "Select an alternative career below to compare your current profile.";

        future = readiness;
      }
    }

    future = Math.min(100, Math.max(readiness, Math.round(future)));

    return {
      futureReadiness: Math.round(future),

      growth: Math.max(0, Math.round(future - readiness)),

      title,
      explanation,
      actions,
      simulatedCareer,
    };
  }, [
    student,
    career,
    readiness,
    careerName,
    selectedScenario,
    selectedAlternativeCareer,
    biggestGap,
  ]);

  function continueToRecommendations() {
    if (!userId) return;

    localStorage.setItem(
      getStudentStorageKey(userId, "simulation"),
      JSON.stringify({
        career: simulated.simulatedCareer,

        originalCareer: careerName,

        readiness,

        futureReadiness: simulated.futureReadiness,

        potentialGrowth: simulated.growth,

        scenario: scenarios.find((item) => item.id === selectedScenario)?.name,

        prioritySkills: prioritySkills.map((skill) => skill.skill),
      }),
    );

    localStorage.setItem(
      getStudentStorageKey(userId, "selected_career"),
      simulated.simulatedCareer,
    );

    router.push("/recommendations");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-5">🔮</div>

          <h1 className="text-2xl font-bold">
            Preparing Your Future Simulation...
          </h1>

          <p className="text-slate-400 mt-3">
            NEXUS is calculating your possible future paths.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-5 py-10">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}

        <div className="mb-10">
          <button
            onClick={() => router.push("/skill-gaps")}
            className="text-sm text-slate-400 hover:text-white transition mb-6"
          >
            ← Back to Skill Gaps
          </button>

          <p className="text-cyan-400 font-semibold tracking-wide uppercase text-sm">
            NEXUS • Future Simulator
          </p>

          <h1 className="text-4xl md:text-5xl font-bold mt-2">
            What If You Changed Your Future?
          </h1>

          <p className="text-slate-400 mt-3 max-w-3xl leading-7">
            NEXUS lets you experiment with different decisions and estimate how
            they could change your career readiness.
          </p>
        </div>

        {/* CURRENT CAREER */}

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-7 mb-8">
          <p className="text-sm text-slate-500 uppercase tracking-wide">
            Current Target Career
          </p>

          <h2 className="text-3xl font-bold mt-2">{careerName}</h2>

          <p className="text-slate-400 mt-2">
            Current estimated readiness:{" "}
            <span className="text-cyan-400 font-bold">{readiness}%</span>
          </p>
        </section>

        {/* SCENARIOS */}

        <section className="mb-10">
          <div className="mb-5">
            <p className="text-cyan-400 text-sm font-semibold uppercase">
              Decision Simulator
            </p>

            <h2 className="text-2xl font-bold mt-1">
              What do you want to change?
            </h2>

            <p className="text-slate-500 mt-2">
              Choose a scenario and NEXUS will recalculate your estimated future
              readiness.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {scenarios.map((scenario) => {
              const selected = scenario.id === selectedScenario;

              return (
                <button
                  key={scenario.id}
                  onClick={() => setSelectedScenario(scenario.id)}
                  className={`text-left rounded-2xl border p-6 transition ${
                    selected
                      ? "border-cyan-400 bg-cyan-400/10"
                      : "border-slate-800 bg-slate-900 hover:border-slate-600"
                  }`}
                >
                  <span className="text-3xl">{scenario.icon}</span>

                  <h3 className="text-xl font-bold mt-5">{scenario.name}</h3>

                  <p className="text-slate-400 mt-3 leading-6">
                    {scenario.description}
                  </p>

                  {selected && (
                    <p className="text-xs font-bold text-cyan-400 mt-4">
                      SELECTED
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ALTERNATIVE CAREER */}

        {selectedScenario === "career" && (
          <section className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-7 mb-10">
            <p className="text-purple-400 text-sm font-semibold uppercase">
              Career Branching
            </p>

            <h2 className="text-2xl font-bold mt-2">
              Choose an alternative future
            </h2>

            <p className="text-slate-400 mt-2 mb-5">
              Compare your current profile with another career path.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allCareers.map((item) => {
                const selected = selectedAlternativeCareer === item.name;

                return (
                  <button
                    key={item.name}
                    onClick={() => setSelectedAlternativeCareer(item.name)}
                    className={`text-left rounded-xl border p-5 transition ${
                      selected
                        ? "border-purple-400 bg-purple-400/10"
                        : "border-slate-800 bg-slate-900 hover:border-slate-600"
                    }`}
                  >
                    <p className="font-bold">{item.name}</p>

                    {selected && (
                      <p className="text-xs text-purple-400 mt-2 font-semibold">
                        SIMULATING THIS PATH
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* RESULT */}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <p className="text-sm text-slate-500 uppercase">
              Your Current State
            </p>

            <span className="text-6xl font-bold block mt-3">{readiness}%</span>

            <div className="h-3 bg-slate-800 rounded-full mt-6 overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full"
                style={{
                  width: `${readiness}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-8">
            <p className="text-sm text-slate-500 uppercase">Simulated Future</p>

            <span className="text-6xl font-bold block mt-3">
              {simulated.futureReadiness}%
            </span>

            <p className="text-emerald-400 font-semibold mt-4">
              +{simulated.growth}% estimated improvement
            </p>

            <div className="h-3 bg-slate-800 rounded-full mt-6 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full"
                style={{
                  width: `${simulated.futureReadiness}%`,
                }}
              />
            </div>
          </div>
        </section>

        {/* INTELLIGENCE RESULT */}

        <section className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-8 mb-10">
          <p className="text-cyan-400 text-sm font-semibold uppercase">
            NEXUS Simulation Result
          </p>

          <h2 className="text-3xl font-bold mt-2">{simulated.title}</h2>

          <p className="text-slate-400 mt-4 max-w-4xl leading-7">
            {simulated.explanation}
          </p>

          {simulated.actions.length > 0 && (
            <div className="mt-7">
              <p className="font-semibold mb-3">
                What would make this future possible?
              </p>

              <div className="space-y-3">
                {simulated.actions.map((action, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <span className="w-7 h-7 rounded-full bg-cyan-400/10 text-cyan-400 flex items-center justify-center text-sm font-bold shrink-0">
                      {index + 1}
                    </span>

                    <p className="text-slate-300">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* PRIORITY SKILLS */}

        <section className="mb-10">
          <h2 className="text-2xl font-bold">Current Priority Skills</h2>

          <p className="text-slate-500 mt-1 mb-5">
            Areas with the biggest improvement opportunity.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {prioritySkills.map((skill) => (
              <div
                key={skill.skill}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <p className="text-lg font-bold">{skill.skill}</p>

                <p className="text-sm text-slate-500 mt-2">Current readiness</p>

                <p className="text-3xl font-bold mt-1">{skill.readiness}%</p>

                <p className="text-sm text-orange-400 mt-3">
                  {skill.gap}% improvement gap
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}

        <section className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-8 text-center">
          <p className="text-cyan-400 text-sm font-semibold uppercase">
            Future Simulation Complete
          </p>

          <h2 className="text-3xl font-bold mt-2">
            Turn This Future Into Action
          </h2>

          <p className="text-slate-400 mt-3 max-w-2xl mx-auto">
            NEXUS will convert your selected scenario, career target and skill
            gaps into personalized actions.
          </p>

          <button
            onClick={continueToRecommendations}
            className="mt-7 px-8 py-4 rounded-xl bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 transition"
          >
            Get My Recommendations →
          </button>
        </section>

        <div className="text-center mt-10 text-xs text-slate-600">
          NEXUS • AI Student Future Simulator
        </div>
      </div>
    </main>
  );
}
