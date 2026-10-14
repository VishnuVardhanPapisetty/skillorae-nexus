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

type SkillGap = {
  skill: string;
  readiness: number;
  gap: number;
  status: string;
};

export default function SkillGapsPage() {
  const router = useRouter();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [careerName, setCareerName] = useState("");
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [readiness, setReadiness] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSkillGaps() {
      const userId = await getAuthenticatedUserId();

      if (!userId) {
        router.replace("/student/login");
        setLoading(false);
        return;
      }

      const storedStudent = localStorage.getItem(
        getStudentStorageKey(userId, "student"),
      );
      const storedCareer = localStorage.getItem(
        getStudentStorageKey(userId, "selected_career"),
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

            localStorage.setItem(
              getStudentStorageKey(userId, "selected_career"),
              selectedCareerName,
            );
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

        const skillResults = getSkillGaps(profile, career);
        const overall = getOverallReadiness(profile, career);

        setStudent(profile);
        setCareerName(career.name);
        setGaps(skillResults);
        setReadiness(overall);
      } catch {
        router.push("/analyze");
      } finally {
        setLoading(false);
      }
    }

    void loadSkillGaps();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🧠</div>

          <p className="text-gray-300">Building your skill intelligence...</p>
        </div>
      </main>
    );
  }

  if (!student) {
    return null;
  }

  const strongSkills = gaps.filter((item) => item.status === "Strong");

  const developingSkills = gaps.filter((item) => item.status === "Developing");

  const improvementSkills = gaps.filter(
    (item) => item.status === "Needs Improvement",
  );

  const prioritySkills = [...gaps].sort((a, b) => b.gap - a.gap).slice(0, 3);

  function getLevel(skill: string) {
    if (!student?.skillLevels) {
      return null;
    }

    const exact = student.skillLevels[skill];

    if (exact) {
      return exact;
    }

    const key = Object.keys(student.skillLevels).find(
      (item) => item.trim().toLowerCase() === skill.trim().toLowerCase(),
    );

    return key ? student.skillLevels[key] : null;
  }

  function getSkillExplanation(item: SkillGap) {
    const level = getLevel(item.skill);

    if (level) {
      return `NEXUS estimates this readiness from your self-reported ${level.toLowerCase()} level for ${item.skill}.`;
    }

    if (item.status === "Strong") {
      return `Your current profile provides strong evidence for ${item.skill}.`;
    }

    if (item.status === "Developing") {
      return `You have some foundation in ${item.skill}, but more practical evidence can improve your readiness.`;
    }

    return `NEXUS has limited evidence of ${item.skill} in your current profile. This is a priority development area.`;
  }

  function getAction(skill: string) {
    const actions: Record<string, string> = {
      Programming:
        "Practice DSA, build coding projects, and solve progressively harder problems.",
      "AI / ML":
        "Build ML projects, work with datasets, and understand model evaluation.",
      "Web Development":
        "Build full-stack applications using frontend, backend, APIs and databases.",
      Data: "Practice SQL, data analysis, visualization and real-world datasets.",
      Cybersecurity:
        "Learn networking, secure coding, threat concepts and defensive security.",
    };

    return (
      actions[skill] ??
      `Build practical projects and complete focused exercises in ${skill}.`
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-10">
          <p className="text-sm text-cyan-400 font-medium tracking-wide">
            NEXUS • SKILL INTELLIGENCE
          </p>

          <h1 className="text-4xl md:text-5xl font-bold mt-3">
            Your Skill Gap Analysis
          </h1>

          <p className="text-gray-400 mt-3 max-w-2xl leading-7">
            NEXUS compares your current skill evidence with the requirements of
            your selected career and identifies the areas that will have the
            biggest impact on your future readiness.
          </p>
        </div>

        {/* CAREER TARGET */}
        <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-blue-500/5 p-7 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-7">
            <div>
              <p className="text-cyan-400 text-xs uppercase tracking-wider font-semibold">
                Target Career
              </p>

              <h2 className="text-3xl font-bold mt-2">{careerName}</h2>

              <p className="text-gray-400 mt-2">
                Personalized skill analysis for {student.name}
              </p>
            </div>

            <div className="text-center rounded-2xl border border-cyan-400/20 bg-black/20 px-8 py-5">
              <p className="text-5xl font-bold text-cyan-300">{readiness}%</p>

              <p className="text-gray-500 text-sm mt-2">Current Readiness</p>

              <p className="text-xs text-gray-600 mt-2">
                Estimated from current evidence
              </p>
            </div>
          </div>
        </section>

        {/* SUMMARY */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5">
            <p className="text-gray-400 text-sm">Strong Skills</p>

            <p className="text-3xl font-bold text-emerald-300 mt-2">
              {strongSkills.length}
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Strong current evidence
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.05] p-5">
            <p className="text-gray-400 text-sm">Developing</p>

            <p className="text-3xl font-bold text-yellow-300 mt-2">
              {developingSkills.length}
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Skills with room to grow
            </p>
          </div>

          <div className="rounded-2xl border border-orange-400/20 bg-orange-400/[0.05] p-5">
            <p className="text-gray-400 text-sm">Priority Gaps</p>

            <p className="text-3xl font-bold text-orange-300 mt-2">
              {improvementSkills.length}
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Skills needing focused development
            </p>
          </div>
        </div>

        {/* PRIORITY FOCUS */}
        {prioritySkills.length > 0 && (
          <section className="mb-10 rounded-3xl border border-orange-400/20 bg-orange-400/[0.04] p-7">
            <p className="text-orange-300 text-sm font-semibold uppercase tracking-wider">
              NEXUS Priority Focus
            </p>

            <h2 className="text-2xl font-bold mt-2">Start with these skills</h2>

            <p className="text-gray-400 mt-2 max-w-2xl">
              These areas currently have the largest gaps against the
              requirements of your selected career.
            </p>

            <div className="grid md:grid-cols-3 gap-4 mt-6">
              {prioritySkills.map((item, index) => (
                <div
                  key={item.skill}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >
                  <p className="text-xs text-gray-600">PRIORITY #{index + 1}</p>

                  <h3 className="text-lg font-semibold mt-2">{item.skill}</h3>

                  <div className="flex items-end justify-between mt-5">
                    <div>
                      <p className="text-2xl font-bold text-orange-300">
                        {item.gap}%
                      </p>

                      <p className="text-xs text-gray-500">skill gap</p>
                    </div>

                    <span className="text-sm text-gray-400">
                      {item.readiness}% ready
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SKILL ANALYSIS */}
        <section>
          <div className="mb-6">
            <p className="text-cyan-400 text-sm uppercase tracking-wider font-semibold">
              Required Skill Analysis
            </p>

            <h2 className="text-2xl font-bold mt-2">Where you stand today</h2>

            <p className="text-gray-500 mt-2">
              Each readiness value is an estimate based on the evidence
              currently provided to NEXUS.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {gaps.map((item) => {
              const level = getLevel(item.skill);

              return (
                <div
                  key={item.skill}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"
                >
                  {/* TOP */}
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <h3 className="text-xl font-semibold">{item.skill}</h3>

                      <p
                        className={`text-sm mt-1 ${
                          item.status === "Strong"
                            ? "text-emerald-300"
                            : item.status === "Developing"
                              ? "text-yellow-300"
                              : "text-orange-300"
                        }`}
                      >
                        {item.status}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-3xl font-bold">{item.readiness}%</p>

                      <p className="text-xs text-gray-500">
                        estimated readiness
                      </p>
                    </div>
                  </div>

                  {/* LEVEL */}
                  {level && (
                    <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                      <span className="text-sm text-gray-500">
                        Reported level
                      </span>

                      <span className="text-sm font-semibold text-cyan-300">
                        {level}
                      </span>
                    </div>
                  )}

                  {/* PROGRESS */}
                  <div className="mt-5">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-500">Current evidence</span>

                      <span className="text-gray-300">
                        {item.readiness} / 100
                      </span>
                    </div>

                    <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.status === "Strong"
                            ? "bg-emerald-400"
                            : item.status === "Developing"
                              ? "bg-yellow-400"
                              : "bg-orange-400"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, item.readiness),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* GAP */}
                  <div className="flex justify-between mt-3 text-xs">
                    <span className="text-gray-500">Remaining Gap</span>

                    <span className="text-gray-300">{item.gap}%</span>
                  </div>

                  {/* WHY */}
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
                      Why this score?
                    </p>

                    <p className="text-sm text-gray-400 mt-2 leading-6">
                      {getSkillExplanation(item)}
                    </p>
                  </div>

                  {/* ACTION */}
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <p className="text-xs uppercase tracking-wider text-purple-300 font-semibold">
                      Recommended Action
                    </p>

                    <p className="text-sm text-gray-400 mt-2 leading-6">
                      {getAction(item.skill)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* NEXUS INSIGHT */}
        <section className="mt-10 rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.05] p-7">
          <p className="text-cyan-400 text-sm font-semibold uppercase tracking-wider">
            NEXUS Intelligence
          </p>

          <h2 className="text-2xl font-bold mt-2">
            Your roadmap should follow your biggest gaps.
          </h2>

          <p className="text-gray-400 mt-3 max-w-3xl leading-7">
            NEXUS uses this skill-gap profile as the foundation for your next
            steps. Instead of giving every student the same roadmap, the system
            can prioritize the areas that are currently holding back your
            selected career direction.
          </p>

          {prioritySkills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {prioritySkills.map((item) => (
                <span
                  key={item.skill}
                  className="px-3 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 text-xs"
                >
                  Focus: {item.skill}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* CONTINUE */}
        <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => router.push("/career")}
            className="px-7 py-3 rounded-xl border border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/[0.08] transition"
          >
            ← Back to Careers
          </button>

          <button
            onClick={() => router.push("/simulation")}
            className="px-7 py-3 rounded-xl bg-cyan-400 text-black font-semibold hover:bg-cyan-300 transition"
          >
            Simulate My Future →
          </button>
        </div>

        {/* DISCLAIMER */}
        <div className="mt-10 text-center">
          <p className="text-xs text-gray-600 max-w-2xl mx-auto">
            Readiness values are estimates generated from the information you
            provide. They are intended to guide development priorities, not to
            measure your actual ability with certainty.
          </p>
        </div>
      </div>
    </main>
  );
}
