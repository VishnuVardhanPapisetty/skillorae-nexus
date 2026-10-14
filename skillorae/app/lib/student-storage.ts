import { createSupabaseBrowserClient } from "./supabase";

export type StudentStorageItem = "student" | "selected_career" | "simulation";

export function getStudentStorageKey(
  userId: string,
  item: StudentStorageItem,
): string {
  return `skillorae_${item}_${userId}`;
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;

  const { data: mapping, error: mappingError } = await supabase
    .from("student_users")
    .select("student_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  return mappingError || !mapping ? null : data.user.id;
}
