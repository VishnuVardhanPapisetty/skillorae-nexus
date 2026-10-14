import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  aggregateStudentAnalytics,
  DATA_CATEGORY_STATUS,
  MIN_SUCCESS_SCORE_COVERAGE,
  STUDENT_SUCCESS_THRESHOLDS,
  SUCCESS_SCORE_WEIGHTS,
  summarizeSegments,
  type StudentAcademicRecord,
  type StudentIdentity,
} from "../../../lib/student-success-analytics";
import { readJsonRequestBody } from "../../../lib/ai-request-guards";

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

async function getAuthorizedFaculty() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Cookies can be read-only in some server render contexts.
          }
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      response: jsonResponse({ error: "Sign in with a faculty account." }, 401),
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("faculty_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return {
      response: jsonResponse(
        { error: "Unable to verify faculty authorization." },
        500,
      ),
    };
  }
  if (!membership) {
    return {
      response: jsonResponse(
        { error: "Faculty authorization is required." },
        403,
      ),
    };
  }

  return { supabase, user };
}

export async function GET() {
  try {
    const faculty = await getAuthorizedFaculty();
    if ("response" in faculty) return faculty.response;
    const { supabase } = faculty;

    const { data: studentRows, error: studentsError } = await supabase
      .from("students")
      .select("id, student_code, full_name, branch, year")
      .order("student_code");

    if (studentsError) {
      return jsonResponse({ error: "Unable to load student records." }, 500);
    }

    const students = (studentRows ?? []) as StudentIdentity[];
    let academicRecords: StudentAcademicRecord[] = [];

    if (students.length > 0) {
      const studentIds = students.map((student) => student.id);
      const { data, error } = await supabase
        .from("academic_records")
        .select(
          "student_id, attendance_percentage, marks_percentage, assignment_completion_percentage",
        )
        .in("student_id", studentIds);

      if (error) {
        return jsonResponse({ error: "Unable to load academic records." }, 500);
      }

      academicRecords = (data ?? []) as StudentAcademicRecord[];
    }

    const analytics = aggregateStudentAnalytics(students, academicRecords);

    return jsonResponse({
      methodology: {
        weights: SUCCESS_SCORE_WEIGHTS,
        minimumDataCoveragePercentage: MIN_SUCCESS_SCORE_COVERAGE,
        riskThresholds: STUDENT_SUCCESS_THRESHOLDS,
        caveat:
          "Success scores are a configurable prototype heuristic, not a scientifically validated prediction. Missing categories are excluded, not treated as failures.",
      },
      dataCategories: DATA_CATEGORY_STATUS,
      segments: summarizeSegments(analytics),
      students: analytics,
    });
  } catch {
    return jsonResponse({ error: "Unable to load faculty analytics." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const faculty = await getAuthorizedFaculty();
    if ("response" in faculty) return faculty.response;
    const { supabase, user } = faculty;

    const parsedBody = await readJsonRequestBody(request);
    if (!parsedBody.ok) {
      return jsonResponse({ error: parsedBody.error }, parsedBody.status);
    }
    if (
      !parsedBody.value ||
      typeof parsedBody.value !== "object" ||
      Array.isArray(parsedBody.value)
    ) {
      return jsonResponse({ error: "A valid record update is required." }, 400);
    }

    const body = parsedBody.value as Record<string, unknown>;
    const studentId =
      typeof body.studentId === "string" ? body.studentId.trim() : "";
    const percentageFields = [
      "attendance_percentage",
      "marks_percentage",
      "assignment_completion_percentage",
    ] as const;
    const percentages = Object.fromEntries(
      percentageFields.map((field) => [field, body[field]]),
    ) as Record<(typeof percentageFields)[number], unknown>;

    if (
      !studentId ||
      studentId.length > 128 ||
      percentageFields.some(
        (field) =>
          !(field in body) ||
          !(
            body[field] === null ||
            (typeof body[field] === "number" &&
              Number.isFinite(body[field]) &&
              body[field] >= 0 &&
              body[field] <= 100)
          ),
      )
    ) {
      return jsonResponse(
        { error: "A valid student record update is required." },
        400,
      );
    }

    const { data: targetStudent, error: targetError } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .maybeSingle();
    if (targetError) {
      return jsonResponse(
        { error: "Unable to verify the target student." },
        500,
      );
    }
    if (!targetStudent) {
      return jsonResponse({ error: "The target student was not found." }, 404);
    }

    const { error: saveError } = await supabase.from("academic_records").upsert(
      {
        student_id: targetStudent.id,
        attendance_percentage: percentages.attendance_percentage,
        marks_percentage: percentages.marks_percentage,
        assignment_completion_percentage:
          percentages.assignment_completion_percentage,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" },
    );

    if (saveError) {
      return jsonResponse(
        { error: "Academic record could not be saved." },
        500,
      );
    }

    return jsonResponse({ success: true });
  } catch {
    return jsonResponse({ error: "Unable to save academic record." }, 500);
  }
}
