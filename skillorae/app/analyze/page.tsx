"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../lib/supabase";
import { getStudentStorageKey } from "../lib/student-storage";

const skills = [
  "Programming",
  "AI / ML",
  "Web Development",
  "Data",
  "Cybersecurity",
];

const skillLevels = ["Beginner", "Basic", "Intermediate", "Advanced"];

const inputClass =
  "mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400/50";

const labelClass = "text-sm text-zinc-400";

type SavedProfile = {
  cgpa: number | null;
  interests: string[] | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  skills: unknown;
};

export default function AnalyzePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [cgpa, setCgpa] = useState("");

  const [attendance, setAttendance] = useState("");
  const [assignmentCompletion, setAssignmentCompletion] = useState("");
  const [marks, setMarks] = useState("");

  const [interests, setInterests] = useState("");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillLevelsByName, setSkillLevelsByName] = useState<
    Record<string, string>
  >({});

  const [error, setError] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadVerifiedProfile() {
      setProfileLoading(true);
      setProfileReady(false);
      setError("");

      try {
        const supabase = createSupabaseBrowserClient();

        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          router.replace("/student/login");
          return;
        }

        const authenticatedUserId = authData.user.id;

        const { data: mapping, error: mappingError } = await supabase
          .from("student_users")
          .select("student_id")
          .eq("user_id", authenticatedUserId)
          .maybeSingle();

        if (mappingError || !mapping) {
          throw new Error(
            "Your student profile is not linked. Please contact faculty.",
          );
        }

        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("id, full_name, branch, year")
          .eq("id", mapping.student_id)
          .maybeSingle();

        if (studentError || !student) {
          throw new Error("Could not load your verified student profile.");
        }

        const { data: academic, error: academicError } = await supabase
          .from("academic_records")
          .select(
            "attendance_percentage, marks_percentage, assignment_completion_percentage",
          )
          .eq("student_id", mapping.student_id)
          .maybeSingle();

        if (academicError) {
          throw new Error("Could not load your academic records.");
        }

        const { data: savedProfile, error: savedProfileError } = await supabase
          .from("student_profiles")
          .select("cgpa, interests, strengths, weaknesses, skills")
          .eq("student_id", mapping.student_id)
          .maybeSingle();

        if (savedProfileError) {
          throw new Error("Could not load your saved personal profile.");
        }

        if (cancelled) return;

        setUserId(authenticatedUserId);
        setName(student.full_name);
        setBranch(student.branch);
        setYear(student.year);

        setAttendance(
          academic?.attendance_percentage == null
            ? ""
            : String(academic.attendance_percentage),
        );

        setMarks(
          academic?.marks_percentage == null
            ? ""
            : String(academic.marks_percentage),
        );

        setAssignmentCompletion(
          academic?.assignment_completion_percentage == null
            ? ""
            : String(academic.assignment_completion_percentage),
        );

        if (savedProfile) {
          setCgpa(savedProfile.cgpa == null ? "" : String(savedProfile.cgpa));

          setInterests((savedProfile.interests ?? []).join(", "));
          setStrengths((savedProfile.strengths ?? []).join(", "));
          setWeaknesses((savedProfile.weaknesses ?? []).join(", "));

          const rawSkills = savedProfile.skills;

          // Current database format: { "Programming": "Intermediate" }
          if (
            rawSkills !== null &&
            typeof rawSkills === "object" &&
            !Array.isArray(rawSkills)
          ) {
            const levels: Record<string, string> = {};

            for (const [skill, level] of Object.entries(rawSkills)) {
              if (
                skills.includes(skill) &&
                typeof level === "string" &&
                skillLevels.includes(level)
              ) {
                levels[skill] = level;
              }
            }

            setSelectedSkills(Object.keys(levels));
            setSkillLevelsByName(levels);
          } else {
            // Support older array-shaped skill data without inventing levels.
            setSelectedSkills([]);
            setSkillLevelsByName({});
          }
        }

        setProfileReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load your student profile.",
          );
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    void loadVerifiedProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((current) => {
      if (current.includes(skill)) {
        setSkillLevelsByName((levels) => {
          const updated = { ...levels };
          delete updated[skill];
          return updated;
        });

        return current.filter((item) => item !== skill);
      }

      return [...current, skill];
    });

    setError("");
  };

  const setSkillLevel = (skill: string, level: string) => {
    setSkillLevelsByName((current) => ({
      ...current,
      [skill]: level,
    }));

    setError("");
  };

  const handleContinue = async () => {
    if (saving) return;

    if (profileLoading) {
      setError("Please wait while your student profile loads.");
      return;
    }

    if (!profileReady) {
      setError(
        "Your verified profile could not be loaded. Please refresh or contact faculty.",
      );
      return;
    }

    if (!userId) {
      setError("Your signed-in student account could not be verified.");
      return;
    }

    const cleanName = name.trim();
    const cleanBranch = branch.trim();
    const cgpaNumber = Number(cgpa);

    if (cleanName.length < 2 || cleanBranch.length < 2 || !year) {
      setError("Your verified student details are incomplete.");
      return;
    }

    if (
      cgpa.trim() === "" ||
      !Number.isFinite(cgpaNumber) ||
      cgpaNumber < 0 ||
      cgpaNumber > 10
    ) {
      setError("Please enter a valid CGPA between 0 and 10.");
      return;
    }

    if (selectedSkills.length === 0) {
      setError("Please select at least one skill.");
      return;
    }

    const missingSkillLevel = selectedSkills.find(
      (skill) => !skillLevelsByName[skill],
    );

    if (missingSkillLevel) {
      setError(`Please select your level for ${missingSkillLevel}.`);
      return;
    }

    if (interests.trim().length < 2) {
      setError("Please enter at least one interest.");
      return;
    }

    const studentData = {
      name: cleanName,
      branch: cleanBranch,
      year,
      cgpa: cgpaNumber.toString(),

      ...(attendance.trim() !== "" &&
        Number.isFinite(Number(attendance)) && {
          attendance: Number(attendance),
        }),

      ...(assignmentCompletion.trim() !== "" &&
        Number.isFinite(Number(assignmentCompletion)) && {
          assignmentCompletion: Number(assignmentCompletion),
        }),

      ...(marks.trim() !== "" &&
        Number.isFinite(Number(marks)) && {
          marks: Number(marks),
        }),

      interests: interests.trim(),
      strengths: strengths.trim(),
      weaknesses: weaknesses.trim(),
      skills: selectedSkills,
      skillLevels: skillLevelsByName,
    };

    setSaving(true);
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();

      // Verify the current authenticated session.
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user || authData.user.id !== userId) {
        throw new Error(
          "Your session could not be verified. Please sign in again.",
        );
      }

      // Resolve the authenticated user to their own student record.
      const { data: mapping, error: mappingError } = await supabase
        .from("student_users")
        .select("student_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (mappingError || !mapping) {
        throw new Error("Your student account mapping could not be verified.");
      }

      const { error: saveError } = await supabase
        .from("student_profiles")
        .upsert(
          {
            student_id: mapping.student_id,
            cgpa: cgpaNumber,
            interests: [interests.trim()],
            strengths: strengths.trim() ? [strengths.trim()] : [],
            weaknesses: weaknesses.trim() ? [weaknesses.trim()] : [],
            skills: Object.fromEntries(
              selectedSkills.map((skill) => [skill, skillLevelsByName[skill]]),
            ),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id" },
        );

      if (saveError) {
        console.error("Student profile save failed:", saveError);
        throw new Error(
          "Could not save your profile to the database. Please try again.",
        );
      }

      // Keep the existing local profile format for the Career page.
      localStorage.setItem(
        getStudentStorageKey(userId, "student"),
        JSON.stringify(studentData),
      );

      router.push("/career");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save your profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <div className="text-xl font-bold">
            SKILL<span className="text-cyan-400">ORAE</span>
          </div>
          <div className="text-right text-sm text-zinc-500">
            Step 01 · Student Intelligence
          </div>
        </div>

        <section className="mt-16">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">
            Digital Student Profile
          </p>
          <h1 className="mt-4 text-4xl font-semibold sm:text-6xl">
            Let&apos;s understand you.
          </h1>
          <p className="mt-5 max-w-2xl text-zinc-400">
            NEXUS builds your intelligent digital profile using verified
            academic data, skills, interests, and career goals.
          </p>
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div>
            <h2 className="text-xl font-semibold">01 · Basic Profile</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Your identity is retrieved from your verified student record.
            </p>
          </div>

          {profileLoading && (
            <p className="mt-5 text-sm text-cyan-300">
              Loading your verified student profile...
            </p>
          )}

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <label className={labelClass}>Your Name</label>
              <input
                value={name}
                readOnly
                placeholder="Loading name..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Branch</label>
              <input
                value={branch}
                readOnly
                placeholder="Loading branch..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Current Year / Semester</label>
              <input
                value={year}
                readOnly
                placeholder="Loading year..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Current CGPA</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={cgpa}
                onChange={(e) => {
                  setCgpa(e.target.value);
                  setError("");
                }}
                placeholder="e.g. 7.5"
                className={inputClass}
                disabled={profileLoading || !profileReady || saving}
              />
              <p className="mt-2 text-xs text-zinc-500">
                Your CGPA is saved to your student profile.
              </p>
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 pt-10">
            <h2 className="text-xl font-semibold">
              02 · Academic Intelligence
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              These values are managed by faculty and are read-only here.
            </p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div>
              <label className={labelClass}>Attendance %</label>
              <input
                type="number"
                value={attendance}
                readOnly
                placeholder="Not recorded"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Assignment Completion %</label>
              <input
                type="number"
                value={assignmentCompletion}
                readOnly
                placeholder="Not recorded"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Average Marks %</label>
              <input
                type="number"
                value={marks}
                readOnly
                placeholder="Not recorded"
                className={inputClass}
              />
            </div>
          </div>

          {!profileLoading &&
            profileReady &&
            !attendance &&
            !assignmentCompletion &&
            !marks && (
              <p className="mt-4 text-sm text-amber-300">
                No academic values are currently recorded. Ask faculty to update
                your record. Missing values are not treated as zero.
              </p>
            )}

          <div className="mt-12 border-t border-white/10 pt-10">
            <h2 className="text-xl font-semibold">
              03 · Skills &amp; Evidence
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Select your skills, then choose your current level.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {skills.map((skill) => {
              const isSelected = selectedSkills.includes(skill);

              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  disabled={saving}
                  className={`rounded-full border px-4 py-3 text-sm transition ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                      : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/30"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {isSelected ? "✓ " : "+ "}
                  {skill}
                </button>
              );
            })}
          </div>

          {selectedSkills.length > 0 && (
            <div className="mt-6 space-y-4">
              {selectedSkills.map((skill) => (
                <div
                  key={skill}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="font-medium">{skill}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skillLevels.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setSkillLevel(skill, level)}
                        disabled={saving}
                        className={`rounded-full border px-3 py-2 text-sm transition ${
                          skillLevelsByName[skill] === level
                            ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                            : "border-white/10 text-zinc-400 hover:border-white/30"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-12 border-t border-white/10 pt-10">
            <h2 className="text-xl font-semibold">
              04 · Personal Intelligence
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Help NEXUS understand your goals and areas for improvement.
            </p>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <label className={labelClass}>Interests and Career Goals</label>
              <textarea
                value={interests}
                onChange={(e) => {
                  setInterests(e.target.value);
                  setError("");
                }}
                placeholder="e.g. AI, personal AI assistants, software development..."
                rows={3}
                className={inputClass}
                disabled={saving}
              />
            </div>

            <div>
              <label className={labelClass}>Your Strengths (optional)</label>
              <textarea
                value={strengths}
                onChange={(e) => {
                  setStrengths(e.target.value);
                  setError("");
                }}
                placeholder="What are you good at?"
                rows={2}
                className={inputClass}
                disabled={saving}
              />
            </div>

            <div>
              <label className={labelClass}>
                Areas You Want to Improve (optional)
              </label>
              <textarea
                value={weaknesses}
                onChange={(e) => {
                  setWeaknesses(e.target.value);
                  setError("");
                }}
                placeholder="What would you like to improve?"
                rows={2}
                className={inputClass}
                disabled={saving}
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              Academic values come from your verified student record.
            </p>

            <button
              type="button"
              onClick={handleContinue}
              disabled={profileLoading || !profileReady || saving}
              className="rounded-2xl bg-cyan-400 px-7 py-4 font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {profileLoading
                ? "Loading profile..."
                : saving
                  ? "Saving profile..."
                  : "Continue to Career Analysis →"}
            </button>
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-zinc-600">
          NEXUS · AI Student Future Simulator
        </footer>
      </div>
    </main>
  );
}
