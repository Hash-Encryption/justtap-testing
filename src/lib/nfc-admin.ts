import { supabase } from "./supabase";

export type NfcInventoryRow = {
  tag_id: string;
  token: string;
  status: "active" | "inactive" | "revoked";
  created_at: string;
  assigned_at: string | null;
  card_id: string | null;
  card_slug: string | null;
  card_name: string | null;
};

export type CardAssignmentOption = {
  id: string;
  slug: string;
  full_name: string;
};

export async function provisionNfcTag(cardId?: string) {
  const { data, error } = await supabase.rpc("admin_provision_nfc_tag", {
    _card_id: cardId || null,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  const rows = Array.isArray(data) ? data : [data];
  return { data: rows[0] || null, error: null };
}

export async function assignNfcTag(token: string, cardId: string) {
  const { data, error } = await supabase.rpc("admin_assign_nfc_tag", {
    _token: token,
    _card_id: cardId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: Boolean(data), error: null };
}

export async function updateTagStatus(token: string, status: "active" | "inactive" | "revoked") {
  const { data, error } = await supabase.rpc("admin_update_tag_status", {
    _token: token,
    _status: status,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: Boolean(data), error: null };
}

export async function getNfcInventory() {
  const { data, error } = await supabase.rpc("admin_get_nfc_inventory");

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as NfcInventoryRow[]) || [], error: null };
}

export async function searchCardsForAssignment(query?: string) {
  const { data, error } = await supabase.rpc("admin_search_cards_for_assignment", {
    _query: query || null,
  });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as CardAssignmentOption[]) || [], error: null };
}
