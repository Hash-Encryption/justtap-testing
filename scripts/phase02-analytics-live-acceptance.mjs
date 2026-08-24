import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const projectRef = "nlumgigqlaymjiwgpvtp";
const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

assert(url?.includes(projectRef), `SUPABASE_URL must target ${projectRef}`);
assert(anonKey, "SUPABASE_ANON_KEY is required");
assert(serviceKey, "SUPABASE_SERVICE_ROLE_KEY is required");

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, options);
const visitor = createClient(url, anonKey, options);
const createdUsers = [];

function pass(label) {
  console.log(`PASS ${label}`);
}

async function createTestUser(label, suffix) {
  const email = `phase02-analytics-${label}-${suffix}@example.invalid`;
  const password = `P2!${randomUUID()}aA`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Phase 02 Analytics ${label}` },
  });
  assert.ifError(error);
  assert(data.user);
  createdUsers.push(data.user.id);

  const client = createClient(url, anonKey, options);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(signInError);
  return { client, id: data.user.id };
}

async function createCard(user, slug, active = true) {
  const { data, error } = await user.client
    .from("cards")
    .insert({
      user_id: user.id,
      slug,
      full_name: "Phase 02 Analytics Test",
      phone: "+966501234567",
      is_active: active,
    })
    .select("id")
    .single();
  assert.ifError(error);
  return data.id;
}

async function record(slug, eventType, eventId, sessionId, metadata = {}) {
  return visitor.rpc("record_public_card_event", {
    _card_slug: slug,
    _event_type: eventType,
    _event_id: eventId,
    _session_id: sessionId,
    _metadata: metadata,
  });
}

async function main() {
  const suffix = randomUUID().slice(0, 8);
  const userA = await createTestUser("a", suffix);
  const userB = await createTestUser("b", suffix);
  const slugA = `phase02-analytics-a-${suffix}`;
  const inactiveSlug = `phase02-analytics-off-${suffix}`;
  const cardA = await createCard(userA, slugA);
  await createCard(userB, inactiveSlug, false);

  const sessionId = randomUUID();
  const pageEventId = randomUUID();
  const first = await record(slugA, "page_view", pageEventId, sessionId, {
    referrer_host: "example.com",
    device_category: "mobile",
  });
  assert.ifError(first.error);
  assert.equal(first.data, true);

  const download = await record(slugA, "vcard_download", randomUUID(), sessionId);
  assert.ifError(download.error);
  assert.equal(download.data, true);
  pass("active-card page_view and vcard_download ingestion");

  const retry = await record(slugA, "page_view", pageEventId, sessionId, {
    referrer_host: "example.com",
    device_category: "mobile",
  });
  assert.ifError(retry.error);
  assert.equal(retry.data, false);

  const separate = await record(slugA, "page_view", randomUUID(), sessionId);
  assert.ifError(separate.error);
  assert.equal(separate.data, true);
  const { count: deduplicatedCount, error: countError } = await admin
    .from("card_analytics")
    .select("id", { count: "exact", head: true })
    .eq("card_id", cardA);
  assert.ifError(countError);
  assert.equal(deduplicatedCount, 3);
  pass("same event identity deduplicates while separate events remain recordable");

  for (const [label, args] of [
    ["unsupported event", [slugA, "made_up_event", randomUUID(), sessionId, {}]],
    ["malformed event id", [slugA, "page_view", "not-a-uuid", sessionId, {}]],
    ["malformed session id", [slugA, "page_view", randomUUID(), "not-a-uuid", {}]],
    [
      "unsupported metadata",
      [slugA, "page_view", randomUUID(), sessionId, { email: "private@example.com" }],
    ],
    [
      "oversized metadata",
      [slugA, "page_view", randomUUID(), sessionId, { referrer_host: "x".repeat(254) }],
    ],
  ]) {
    const { error } = await record(...args);
    assert(error, `${label} should be rejected`);
  }
  pass("event, identifier, session, and metadata validation");

  const { error: inactiveError } = await record(inactiveSlug, "page_view", randomUUID(), sessionId);
  const { error: missingError } = await record(
    `phase02-analytics-missing-${suffix}`,
    "page_view",
    randomUUID(),
    sessionId,
  );
  assert(inactiveError);
  assert(missingError);

  const { error: internalCardSpoofError } = await visitor.rpc("record_public_card_event", {
    _card_slug: slugA,
    _card_id: cardA,
    _event_type: "page_view",
    _event_id: randomUUID(),
    _session_id: sessionId,
    _metadata: {},
  });
  assert(internalCardSpoofError);
  pass("inactive, missing, and internal-card spoofing are rejected");

  const { error: directInsertError } = await visitor.from("card_analytics").insert({
    card_id: cardA,
    event_type: "page_view",
    event_id: randomUUID(),
  });
  assert(directInsertError);

  const { data: publicRead, error: publicReadError } = await visitor
    .from("card_analytics")
    .select("id");
  assert(publicReadError || publicRead?.length === 0);

  const { data: rowsBefore, error: rowsBeforeError } = await admin
    .from("card_analytics")
    .select("id")
    .eq("card_id", cardA);
  assert.ifError(rowsBeforeError);
  const eventToProtect = rowsBefore[0].id;
  const { error: updateError } = await visitor
    .from("card_analytics")
    .update({ event_type: "share" })
    .eq("id", eventToProtect);
  const { error: deleteError } = await visitor
    .from("card_analytics")
    .delete()
    .eq("id", eventToProtect);
  assert(updateError);
  assert(deleteError);

  const { count: rowsAfter, error: rowsAfterError } = await admin
    .from("card_analytics")
    .select("id", { count: "exact", head: true })
    .eq("card_id", cardA);
  assert.ifError(rowsAfterError);
  assert.equal(rowsAfter, rowsBefore.length);
  pass("anonymous direct insert, read, update, and delete are denied");

  const { data: ownRows, error: ownRowsError } = await userA.client
    .from("card_analytics")
    .select("event_type, event_id, session_id, metadata, user_agent")
    .eq("card_id", cardA);
  assert.ifError(ownRowsError);
  assert.equal(ownRows.length, 3);
  assert(ownRows.every((row) => row.user_agent === null));

  const { data: crossRows, error: crossRowsError } = await userB.client
    .from("card_analytics")
    .select("id")
    .eq("card_id", cardA);
  assert.ifError(crossRowsError);
  assert.deepEqual(crossRows, []);

  const { error: ownerDirectInsertError } = await userA.client.from("card_analytics").insert({
    card_id: cardA,
    event_type: "page_view",
    event_id: randomUUID(),
  });
  assert(ownerDirectInsertError);
  pass("owner reads remain isolated and authenticated direct inserts are denied");
}

try {
  await main();
} finally {
  for (const userId of createdUsers.reverse()) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    assert.ifError(error);
  }
  if (createdUsers.length) pass("synthetic users and dependent records cleaned up");
}
