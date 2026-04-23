import { createClient } from "@supabase/supabase-js";

type ProfessionalProfileInput = {
  userId: string;
  name?: string | null;
  licenseNo?: string | null;
  experienceYears?: string | null;
  specialties?: string[] | null;
  hospitalName?: string | null;
  blogUrl?: string | null;
  bio?: string | null;
};

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function cleanSpecialties(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export async function upsertProfessionalProfile(input: ProfessionalProfileInput): Promise<{ ok: true } | { ok: false; message: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    return { ok: false, message: "supabase admin not configured" };
  }

  const supabase = createClient(url, serviceRole);
  const metadata = {
    name: cleanString(input.name),
    license_no: cleanString(input.licenseNo),
    experience_years: cleanString(input.experienceYears),
    specialties: cleanSpecialties(input.specialties),
    hospital_name: cleanString(input.hospitalName),
    blog_url: cleanString(input.blogUrl),
    bio: cleanString(input.bio),
  };

  const fullPayload = {
    id: input.userId,
    name: metadata.name,
    license_no: metadata.license_no,
    experience_years: metadata.experience_years,
    specialties: metadata.specialties,
    hospital_name: metadata.hospital_name,
    blog_url: metadata.blog_url,
    bio: metadata.bio,
    metadata,
  };

  const full = await supabase.from("profiles").upsert(fullPayload as never, { onConflict: "id" });
  if (!full.error) return { ok: true };

  const metaOnly = await supabase.from("profiles").upsert(
    {
      id: input.userId,
      metadata,
    } as never,
    { onConflict: "id" },
  );
  if (!metaOnly.error) return { ok: true };

  const idOnly = await supabase.from("profiles").upsert({ id: input.userId } as never, { onConflict: "id" });
  if (!idOnly.error) return { ok: true };

  return { ok: false, message: idOnly.error?.message ?? metaOnly.error?.message ?? full.error?.message ?? "profile upsert failed" };
}
