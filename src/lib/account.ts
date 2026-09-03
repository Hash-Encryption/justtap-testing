import { supabase } from "./supabase";

const STORAGE_BUCKET = "cards";

export interface UserProfileData {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  plan_tier: string;
  trial_ends_at: string | null;
  created_at: string;
}

export async function getUserProfile(
  userId: string,
): Promise<{ data: UserProfileData | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as UserProfileData | null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to load profile" };
  }
}

export async function uploadAccountAvatar(
  userId: string,
  fileOrDataUrl: File | string,
): Promise<{ url: string | null; error: string | null }> {
  try {
    let blob: Blob;
    let contentType = "image/png";
    let ext = "png";

    if (typeof fileOrDataUrl === "string") {
      if (!fileOrDataUrl.startsWith("data:")) {
        return { url: fileOrDataUrl, error: null };
      }
      const res = await fetch(fileOrDataUrl);
      blob = await res.blob();
      contentType = fileOrDataUrl.split(";")[0].split(":")[1] || "image/png";
      ext = contentType.split("/")[1] || "png";
    } else {
      blob = fileOrDataUrl;
      contentType = fileOrDataUrl.type || "image/png";
      ext = contentType.split("/")[1] || "png";
    }

    const path = `${userId}/account_avatar_${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, { contentType, upsert: true, cacheControl: "3600" });

    if (error) {
      return { url: null, error: error.message };
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    return { url: null, error: err instanceof Error ? err.message : "Failed to upload avatar" };
  }
}

export async function updateUserProfile(
  userId: string,
  updates: { full_name?: string; phone?: string; avatar_url?: string | null },
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        ...(updates.full_name !== undefined ? { full_name: updates.full_name.trim() } : {}),
        ...(updates.phone !== undefined ? { phone: updates.phone.trim() } : {}),
        ...(updates.avatar_url !== undefined ? { avatar_url: updates.avatar_url } : {}),
      })
      .eq("user_id", userId);

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update profile" };
  }
}

export interface UpdatePasswordParams {
  currentPassword?: string;
  newPassword: string;
  email?: string;
}

export async function updateUserPassword(
  params: UpdatePasswordParams,
): Promise<{ error: string | null; isInvalidCurrentPassword?: boolean }> {
  try {
    if (params.email && params.currentPassword) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.currentPassword,
      });

      if (verifyError) {
        return { error: "INVALID_CURRENT_PASSWORD", isInvalidCurrentPassword: true };
      }
    }

    const { error } = await supabase.auth.updateUser({ password: params.newPassword });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to change password" };
  }
}

export async function updateUserEmail(newEmail: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update email" };
  }
}

export async function deleteUserAccount(
  jwt: string,
  confirmation: string,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const response = await fetch("/api/account-delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ confirmation }),
    });

    const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };

    if (!response.ok || !result.ok) {
      return { ok: false, error: result.error || "Failed to delete account" };
    }

    return { ok: true, error: null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error during account deletion",
    };
  }
}
