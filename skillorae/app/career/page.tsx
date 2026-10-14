"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAuthenticatedUserId,
  getStudentStorageKey,
} from "../lib/student-storage";
import {
  getCareerMatches,
  StudentProfile,
  CareerMatch,
} from "../lib/career-engine";

export default function CareerPage() {
  const router = useRouter();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [matches, setMatches] = useState<CareerMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCareer, setSelectedCareer] = useState<string | null>(null);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    async function loadStudentProfile() {
      const authenticatedUserId = await getAuthenticatedUserId();

      if (!authenticatedUserId) {
        router.replace("/student/login");
        setLoading(false);
        return;
      }

      setUserId(authenticatedUserId);
      const stored = localStorage.getItem(
        getStudentStorageKey(authenticatedUserId, "student"),
      );

      if (!stored) {
        router.push("/analyze");
        setLoading(false);
        return;
      }

      try {
        const profile: StudentProfile = JSON.parse(stored);

        setStudent(profile);
        setMatches(getCareerMatches(profile));

        const savedCareer = localStorage.getItem(
          getStudentStorageKey(authenticatedUserId, "selected_career"),
        );

        if (savedCareer) {
          setSelectedCareer(savedCareer);
        }
      } catch {
        router.push("/analyze");
      } finally {
        setLoading(false);
      }
    }

    void loadStudentProfile();
  }, [router]);

  function chooseCareer(careerName: string) {
    if (!userId) return;

    localStorage.setItem(
      getStudentStorageKey(userId, "selected_career"),
      careerName,
    );

    setSelectedCareer(careerName);
  }

  function continueToSkillGaps() {
    if (!selectedCareer) {
      return;
    }

    router.push("/skill-gaps");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🧠</div>

          <p className="text-gray-300">
            Analyzing your career possibilities...
          </p>
        </div>
      </main>
    );
  }

  if (!student || matches.length === 0) {
    return null;
  }

  const topMatch = matches[0];

  const academicHealth = Math.round(
    ((Number(student.cgpa) / 10) * 100 +
      (student.marks ?? 50) +
      (student.attendance ?? 50) +
      (student.assignmentCompletion ?? 50)) /
      4,
  );

  return (
    <main className="min-h-screen bg-[#050816] text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-10">
          <p className="text-sm text-cyan-400 font-medium tracking-wide">
            NEXUS • CAREER INTELLIGENCE
          </p>

          <h1 className="text-4xl md:text-5xl font-bold mt-3">
            Your Career Matches
          </h1>

          <p className="text-gray-400 mt-3 max-w-2xl">
            NEXUS analyzed your academic profile, skill evidence, branch
            alignment and current development level to identify career paths
            that fit your current position.
          </p>
        </div>

        {/* STUDENT SNAPSHOT */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-gray-400 text-sm">Student Profile</p>

              <h2 className="text-2xl font-semibold mt-1">{student.name}</h2>

              <p className="text-gray-400 mt-1">
                {student.branch} • {student.year}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="text-gray-500 text-xs">CGPA</p>

                <p className="text-xl font-semibold mt-1">{student.cgpa}</p>
              </div>

              <div>
                <p className="text-gray-500 text-xs">Attendance</p>

                <p className="text-xl font-semibold mt-1">
                  {student.attendance ?? "—"}%
                </p>
              </div>

              <div>
                <p className="text-gray-500 text-xs">Avg Marks</p>

                <p className="text-xl font-semibold mt-1">
                  {student.marks ?? "—"}%
                </p>
              </div>

              <div>
                <p className="text-gray-500 text-xs">Skills</p>

                <p className="text-xl font-semibold mt-1">
                  {student.skills.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* NEXUS SIGNALS */}
        <section className="mb-10">
          <div className="mb-5">
            <p className="text-cyan-400 text-sm uppercase tracking-wider font-semibold">
              Intelligence Signals
            </p>

            <h2 className="text-2xl font-bold mt-2">What NEXUS is using</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Skill Evidence */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">Skill Evidence</p>

                <span className="text-cyan-400">🧠</span>
              </div>

              <p className="text-2xl font-bold mt-3">{student.skills.length}</p>

              <p className="text-gray-500 text-sm mt-1">reported skills</p>

              <div className="flex flex-wrap gap-2 mt-4">
                {student.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Academic Signal */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">Academic Health</p>

                <span className="text-emerald-400">📚</span>
              </div>

              <p className="text-2xl font-bold mt-3">{academicHealth}%</p>

              <p className="text-gray-500 text-sm mt-1">
                combined academic signal
              </p>

              <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, academicHealth))}%`,
                  }}
                />
              </div>
            </div>

            {/* Personal Signal */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">Personal Direction</p>

                <span className="text-purple-400">🎯</span>
              </div>

              <p className="text-lg font-semibold mt-3">
                {student.interests || "Not provided"}
              </p>

              <p className="text-gray-500 text-sm mt-2">
                interests considered as contextual evidence
              </p>
            </div>
          </div>
        </section>

        {/* BEST MATCH */}
        <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-blue-500/5 p-7 mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 text-xs font-semibold">
                  #1 CURRENT MATCH
                </span>

                <span className="text-xs text-gray-500">
                  Based on current evidence
                </span>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold mt-4">
                {topMatch.career.name}
              </h2>

              <p className="text-gray-300 mt-3 max-w-2xl leading-7">
                {topMatch.career.description}
              </p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
                  Why NEXUS recommends it
                </p>

                <p className="text-gray-300 mt-2 leading-7">
                  {topMatch.explanation}
                </p>
              </div>
            </div>

            <div className="lg:w-48 text-center rounded-2xl border border-cyan-400/20 bg-black/20 p-6">
              <p className="text-5xl font-bold text-cyan-300">
                {topMatch.score}%
              </p>

              <p className="text-gray-400 text-sm mt-2">Current Career Match</p>

              <p className="text-xs text-gray-600 mt-3">
                An estimated fit based on your submitted profile.
              </p>
            </div>
          </div>

          {/* BEST MATCH EVIDENCE */}
          <div className="grid md:grid-cols-2 gap-5 mt-7">
            <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-5">
              <p className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">
                Strong Evidence
              </p>

              <div className="flex flex-wrap gap-2 mt-4">
                {topMatch.matchedSkills.length > 0 ? (
                  topMatch.matchedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1.5 rounded-full text-xs bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                    >
                      ✓ {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    No direct skill evidence yet.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-orange-400/10 bg-orange-400/[0.04] p-5">
              <p className="text-xs uppercase tracking-wider text-orange-300 font-semibold">
                Development Areas
              </p>

              <div className="flex flex-wrap gap-2 mt-4">
                {topMatch.missingSkills.length > 0 ? (
                  topMatch.missingSkills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1.5 rounded-full text-xs bg-orange-400/10 text-orange-300 border border-orange-400/20"
                    >
                      + {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-emerald-300">
                    ✓ No major missing skill category
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CAREER OPTIONS */}
        <section>
          <div className="mb-6">
            <p className="text-cyan-400 text-sm uppercase tracking-wider font-semibold">
              Alternative Futures
            </p>

            <h2 className="text-2xl font-bold mt-2">
              Explore your career routes
            </h2>

            <p className="text-gray-500 mt-2">
              These are not permanent decisions. Choose a direction and NEXUS
              will identify the skills you need to become ready for it.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {matches.map((match, index) => {
              const isSelected = selectedCareer === match.career.name;

              return (
                <div
                  key={match.career.name}
                  className={`rounded-2xl border p-6 transition-all ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-400/[0.08] shadow-lg shadow-cyan-400/10"
                      : index === 0
                        ? "border-cyan-400/30 bg-cyan-400/[0.06]"
                        : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  {/* Rank */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        Rank #{index + 1}
                      </p>

                      <h3 className="text-xl font-semibold mt-2">
                        {match.career.name}
                      </h3>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-cyan-300">
                        {match.score}%
                      </p>

                      <p className="text-xs text-gray-500">current fit</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-400 text-sm mt-4 leading-6">
                    {match.career.description}
                  </p>

                  {/* Explanation */}
                  <div className="mt-5 rounded-xl bg-black/20 border border-white/5 p-4">
                    <p className="text-xs text-cyan-400 uppercase tracking-wider font-semibold">
                      NEXUS insight
                    </p>

                    <p className="text-sm text-gray-400 mt-2 leading-6">
                      {match.explanation}
                    </p>
                  </div>

                  {/* Matched Skills */}
                  <div className="mt-6">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                      Matched Skills
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {match.matchedSkills.length > 0 ? (
                        match.matchedSkills.map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1 rounded-full text-xs bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                          >
                            ✓ {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">
                          No direct matches yet
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Missing Skills */}
                  <div className="mt-5">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                      Skills To Develop
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {match.missingSkills.length > 0 ? (
                        match.missingSkills.map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1 rounded-full text-xs bg-orange-400/10 text-orange-300 border border-orange-400/20"
                          >
                            + {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-emerald-300">
                          ✓ Strong skill alignment
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Choose */}
                  <button
                    onClick={() => chooseCareer(match.career.name)}
                    className={`w-full mt-7 px-4 py-3 rounded-xl font-semibold transition ${
                      isSelected
                        ? "bg-emerald-400 text-black hover:bg-emerald-300"
                        : "bg-white/10 text-white hover:bg-cyan-400 hover:text-black"
                    }`}
                  >
                    {isSelected ? "✓ Career Selected" : "Choose This Career"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* CONTINUE */}
        <div className="mt-12 text-center">
          {selectedCareer ? (
            <>
              <p className="text-gray-400 mb-2">Selected Career</p>

              <p className="text-xl font-semibold text-cyan-300 mb-5">
                {selectedCareer}
              </p>

              <button
                onClick={continueToSkillGaps}
                className="px-8 py-4 rounded-xl bg-cyan-400 text-black font-semibold hover:bg-cyan-300 transition"
              >
                Analyze My Skill Gaps →
              </button>
            </>
          ) : (
            <p className="text-gray-400">Choose a career above to continue.</p>
          )}
        </div>

        {/* FOOTNOTE */}
        <div className="mt-12 text-center">
          <p className="text-xs text-gray-600 max-w-xl mx-auto">
            NEXUS career scores are estimated from the information you provide.
            They represent current readiness and fit, not a prediction of your
            future or a guarantee of employment.
          </p>
        </div>
      </div>
    </main>
  );
}
