"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../lib/supabase";
import type { StudentSuccessAnalysis } from "../lib/student-success-analytics";

type Student = {
  id: string;
  student_code: string;
  full_name: string;
  branch: string;
  year: string;
  analytics: StudentSuccessAnalysis;
};

type AcademicRecord = {
  attendance_percentage: number | null;
  marks_percentage: number | null;
  assignment_completion_percentage: number | null;
};

type FacultyAnalyticsStudent = {
  student: Omit<Student, "analytics">;
  academicRecord: AcademicRecord;
  analytics: StudentSuccessAnalysis;
};

type DataCategory = {
  key: string;
  label: string;
  status: string;
  available: string;
  missing: string;
};

type SegmentSummary = {
  key: string;
  label: string;
  requiredCategories: string[];
  count: number | null;
  dataAvailable: boolean;
};

export default function FacultyPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, AcademicRecord>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [facultyEmail, setFacultyEmail] = useState("");
  const [isFacultyAuthorized, setIsFacultyAuthorized] = useState(false);
  const [dataCategories, setDataCategories] = useState<DataCategory[]>([]);
  const [segments, setSegments] = useState<SegmentSummary[]>([]);
  const [segmentFilter, setSegmentFilter] = useState("all");

  useEffect(() => {
    loadFacultyData();
  }, []);

  async function hasFacultyMembership(userId: string): Promise<boolean> {
    const { data: membership, error } = await supabase
      .from("faculty_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    return !error && Boolean(membership);
  }

  async function loadFacultyData() {
    setLoading(true);
    setMessage("");
    setIsFacultyAuthorized(false);

    // Check login session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/faculty/login");
      return;
    }

    if (!(await hasFacultyMembership(user.id))) {
      setStudents([]);
      setRecords({});
      setFacultyEmail("");
      setMessage(
        "Faculty access could not be verified. Contact your administrator.",
      );
      setLoading(false);
      return;
    }

    setIsFacultyAuthorized(true);
    setFacultyEmail(user.email ?? "");

    try {
      const response = await fetch("/api/faculty/analytics", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        error?: string;
        students?: FacultyAnalyticsStudent[];
        dataCategories?: DataCategory[];
        segments?: SegmentSummary[];
      };

      if (response.status === 401) {
        router.replace("/faculty/login");
        return;
      }
      if (response.status === 403) {
        setIsFacultyAuthorized(false);
        setStudents([]);
        setRecords({});
        setFacultyEmail("");
        setMessage("Faculty authorization is required.");
        return;
      }
      if (!response.ok) {
        throw new Error(
          payload.error || "Faculty analytics could not be loaded.",
        );
      }

      const rows = payload.students ?? [];
      const mappedRecords: Record<string, AcademicRecord> = {};
      setStudents(
        rows.map(({ student, analytics }) => ({ ...student, analytics })),
      );
      for (const row of rows) {
        mappedRecords[row.student.id] = row.academicRecord;
      }
      setRecords(mappedRecords);
      setDataCategories(payload.dataCategories ?? []);
      setSegments(payload.segments ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Faculty analytics could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  function updateRecord(
    studentId: string,
    field: keyof AcademicRecord,
    value: string,
  ) {
    const numericValue = value === "" ? null : Number(value);

    setRecords((previous) => ({
      ...previous,
      [studentId]: {
        attendance_percentage:
          previous[studentId]?.attendance_percentage ?? null,

        marks_percentage: previous[studentId]?.marks_percentage ?? null,

        assignment_completion_percentage:
          previous[studentId]?.assignment_completion_percentage ?? null,

        [field]: numericValue,
      },
    }));
  }

  async function saveRecord(studentId: string) {
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/faculty/login");
      return;
    }

    if (!(await hasFacultyMembership(user.id))) {
      setIsFacultyAuthorized(false);
      setStudents([]);
      setRecords({});
      setFacultyEmail("");
      setMessage(
        "Faculty access could not be verified. Contact your administrator.",
      );
      return;
    }

    const record = records[studentId];

    if (!record) {
      setMessage("No academic data entered.");
      return;
    }

    const response = await fetch("/api/faculty/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        attendance_percentage: record.attendance_percentage,
        marks_percentage: record.marks_percentage,
        assignment_completion_percentage:
          record.assignment_completion_percentage,
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        router.replace("/faculty/login");
        return;
      }
      if (response.status === 403) {
        setIsFacultyAuthorized(false);
        setStudents([]);
        setRecords({});
        setFacultyEmail("");
      }
      setMessage(result.error || "Academic record could not be saved.");
      return;
    }

    setMessage("Academic record saved successfully.");

    // Reload latest database values
    await loadFacultyData();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/faculty/login");
  }

  const visibleStudents =
    segmentFilter === "all"
      ? students
      : students.filter(
          (student) => student.analytics.segment.key === segmentFilter,
        );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
              NEXUS Faculty Portal
            </p>

            <h1 className="mt-2 text-4xl font-bold">
              Student Academic Intelligence
            </h1>

            <p className="mt-2 text-slate-400">
              Faculty-managed verified academic data.
            </p>

            {facultyEmail && (
              <p className="mt-2 text-sm text-slate-500">
                Signed in as {facultyEmail}
              </p>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10"
          >
            Sign out
          </button>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-cyan-300">
            {message}
          </div>
        )}

        {!loading && isFacultyAuthorized && (
          <section
            className="mb-8 space-y-5"
            aria-label="Student success analytics"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Students in roster", value: students.length },
                {
                  label: "Success scores available",
                  value: students.filter(
                    (student) => student.analytics.successScore !== null,
                  ).length,
                },
                {
                  label: "High observed priority",
                  value: students.filter(
                    (student) => student.analytics.riskLevel === "High",
                  ).length,
                },
                {
                  label: "Insufficient score data",
                  value: students.filter(
                    (student) => student.analytics.successScore === null,
                  ).length,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/10 bg-slate-900 p-4"
                >
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
                <h2 className="font-semibold">Data integration status</h2>
                <ul className="mt-3 space-y-3">
                  {dataCategories.map((category) => (
                    <li
                      key={category.key}
                      className="border-b border-white/5 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm text-slate-200">
                          {category.label}
                        </span>
                        <span className="text-xs text-cyan-300">
                          {category.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {category.available} {category.missing}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  The Success Score is a prototype heuristic, not a validated
                  prediction. It uses available categories only and requires at
                  least 60% weighted data coverage.
                </p>
              </section>

              <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
                <h2 className="font-semibold">Student support segments</h2>
                <ul className="mt-3 space-y-3">
                  {segments.map((segment) => (
                    <li
                      key={segment.key}
                      className="flex flex-col gap-1 border-b border-white/5 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between"
                    >
                      <span className="text-sm text-slate-200">
                        {segment.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {segment.count === null
                          ? "Data unavailable"
                          : `${segment.count} students`}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </section>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <p className="text-slate-400">Loading verified student data...</p>
          </div>
        ) : !isFacultyAuthorized ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8">
            <h2 className="text-xl font-semibold">Faculty access required</h2>
            <p className="mt-2 text-slate-300">
              {message ||
                "Your account is not authorized to manage student records."}
            </p>
          </div>
        ) : students.length === 0 ? (
          /* NO STUDENTS */
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-semibold">No students found</h2>

            <p className="mt-2 text-slate-400">
              Faculty access is working, but no student records have been added
              to Supabase yet.
            </p>
          </div>
        ) : (
          /* STUDENT TABLE */
          <div>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400">
                Showing {visibleStudents.length} of {students.length} students.
                Missing assessments are not scored as zero.
              </p>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                Filter segment
                <select
                  value={segmentFilter}
                  onChange={(event) => setSegmentFilter(event.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
                >
                  <option value="all">All segments</option>
                  {segments.map((segment) => (
                    <option
                      key={segment.key}
                      value={segment.key}
                      disabled={!segment.dataAvailable}
                    >
                      {segment.label}
                      {segment.count === null
                        ? " · data unavailable"
                        : ` · ${segment.count}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
              <table className="w-full min-w-[1800px] text-left">
                <thead className="border-b border-white/10 bg-white/5">
                  <tr>
                    <th className="p-4">Student</th>
                    <th className="p-4">Branch</th>
                    <th className="p-4">Year</th>
                    <th className="p-4">Attendance %</th>
                    <th className="p-4">Marks %</th>
                    <th className="p-4">Assignments %</th>
                    <th className="p-4">Success score</th>
                    <th className="p-4">Observed risk</th>
                    <th className="p-4">Support segment</th>
                    <th className="p-4">Evidence-based support</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleStudents.map((student) => {
                    const record = records[student.id];
                    const analytics = student.analytics;

                    return (
                      <tr key={student.id} className="border-b border-white/10">
                        {/* STUDENT */}
                        <td className="p-4">
                          <div className="font-semibold">
                            {student.full_name}
                          </div>

                          <div className="text-sm text-slate-500">
                            {student.student_code}
                          </div>
                        </td>

                        {/* BRANCH */}
                        <td className="p-4">{student.branch}</td>

                        {/* YEAR */}
                        <td className="p-4">{student.year}</td>

                        {/* ATTENDANCE */}
                        <td className="p-4">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={record?.attendance_percentage ?? ""}
                            onChange={(event) =>
                              updateRecord(
                                student.id,
                                "attendance_percentage",
                                event.target.value,
                              )
                            }
                            className="w-24 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 outline-none focus:border-cyan-400"
                          />
                        </td>

                        {/* MARKS */}
                        <td className="p-4">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={record?.marks_percentage ?? ""}
                            onChange={(event) =>
                              updateRecord(
                                student.id,
                                "marks_percentage",
                                event.target.value,
                              )
                            }
                            className="w-24 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 outline-none focus:border-cyan-400"
                          />
                        </td>

                        {/* ASSIGNMENTS */}
                        <td className="p-4">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={
                              record?.assignment_completion_percentage ?? ""
                            }
                            onChange={(event) =>
                              updateRecord(
                                student.id,
                                "assignment_completion_percentage",
                                event.target.value,
                              )
                            }
                            className="w-24 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 outline-none focus:border-cyan-400"
                          />
                        </td>

                        <td className="p-4">
                          <p className="font-semibold">
                            {analytics.successScore === null
                              ? "Insufficient data"
                              : `${analytics.successScore}/100`}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {analytics.dataCoveragePercentage}% coverage ·{" "}
                            {analytics.reliabilityStatus}
                          </p>
                          {analytics.includedCategories.length > 0 && (
                            <details className="mt-2 text-xs text-slate-400">
                              <summary className="cursor-pointer text-cyan-300">
                                Score breakdown
                              </summary>
                              <ul className="mt-2 space-y-1">
                                {analytics.includedCategories.map((item) => (
                                  <li key={item.key}>
                                    {item.label}: {item.observedScore}% ×{" "}
                                    {item.weight}% weight, contributes{" "}
                                    {item.contribution}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </td>

                        <td className="p-4">
                          <p>{analytics.riskLevel}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {analytics.riskCoveragePercentage}% risk-data
                            coverage
                          </p>
                          {analytics.riskFlags.map((flag) => (
                            <p
                              key={flag.key}
                              className="mt-1 max-w-64 text-xs text-amber-200"
                            >
                              {flag.explanation}
                            </p>
                          ))}
                        </td>

                        <td className="p-4">
                          <p>{analytics.segment.label}</p>
                          <p className="mt-1 max-w-64 text-xs text-slate-500">
                            {analytics.segment.rationale}
                          </p>
                        </td>

                        <td className="p-4">
                          {analytics.interventions.length > 0 ? (
                            <ul className="max-w-72 space-y-2">
                              {analytics.interventions.map((item) => (
                                <li key={item.key}>
                                  <p className="text-sm font-medium text-slate-200">
                                    {item.title}
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-slate-400">
                                    {item.rationale}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-xs text-slate-500">
                              No recommendation from observed thresholds
                            </span>
                          )}
                        </td>

                        {/* SAVE */}
                        <td className="p-4">
                          <button
                            onClick={() => saveRecord(student.id)}
                            className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400"
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
