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
  const email = `phase01-${label}-${suffix}@example.invalid`;
  const password = `P1!${randomUUID()}aA`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Phase 01 ${label}` },
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
      full_name: "Phase 01 Test",
      phone: "+966501234567",
      is_active: active,
    })
    .select("id")
    .single();
  assert.ifError(error);
  return data.id;
}

async function submit(slug, overrides = {}) {
  return visitor.rpc("create_public_connection", {
    _card_slug: slug,
    _sender_name: "زائر تجريبي",
    _sender_phone: "+44 (20) 7946-0958",
    _sender_email: "visitor@example.com",
    _sender_company: "شركة عالمية",
    _sender_job_title: "Product Lead",
    _visitor_note: "Focused Phase 01 acceptance record",
    ...overrides,
  });
}

async function main() {
  const suffix = randomUUID().slice(0, 8);
  const userA = await createTestUser("a", suffix);
  const userB = await createTestUser("b", suffix);
  const slugA = `phase01-a-${suffix}`;
  const slugB = `phase01-b-${suffix}`;
  const inactiveSlug = `phase01-off-${suffix}`;
  const cardA = await createCard(userA, slugA);
  const cardB = await createCard(userB, slugB);
  await createCard(userB, inactiveSlug, false);

  const { data: leadA, error: submitAError } = await submit(slugA);
  assert.ifError(submitAError);
  assert.match(leadA, /^[0-9a-f-]{36}$/i);
  const { data: leadB, error: submitBError } = await submit(slugB, {
    _sender_email: null,
    _sender_company: null,
    _sender_job_title: null,
    _visitor_note: null,
  });
  assert.ifError(submitBError);
  assert.match(leadB, /^[0-9a-f-]{36}$/i);
  pass("legitimate public submission and optional fields");

  const { data: ownA, error: ownAError } = await userA.client
    .from("card_leads")
    .select("*")
    .eq("card_id", cardA);
  assert.ifError(ownAError);
  assert.equal(ownA.length, 1);
  assert.equal(ownA[0].sender_company, "شركة عالمية");
  assert.equal(ownA[0].status, "new");
  assert.equal(ownA[0].owner_note, null);
  assert.deepEqual(ownA[0].tags, []);
  pass("User A reads User A connection");

  const { data: crossA, error: crossAError } = await userA.client
    .from("card_leads")
    .select("id")
    .eq("card_id", cardB);
  const { data: crossB, error: crossBError } = await userB.client
    .from("card_leads")
    .select("id")
    .eq("card_id", cardA);
  assert.ifError(crossAError);
  assert.ifError(crossBError);
  assert.deepEqual(crossA, []);
  assert.deepEqual(crossB, []);
  pass("User A and User B are mutually isolated");

  const { data: publicRead, error: publicReadError } = await visitor
    .from("card_leads")
    .select("id");
  assert(publicReadError || publicRead?.length === 0);

  await visitor.from("card_leads").update({ note: "public mutation" }).eq("id", leadA);
  await visitor.from("card_leads").delete().eq("id", leadA);
  const { data: unchanged, error: unchangedError } = await admin
    .from("card_leads")
    .select("note")
    .eq("id", leadA)
    .single();
  assert.ifError(unchangedError);
  assert.equal(unchanged.note, "Focused Phase 01 acceptance record");
  pass("anonymous read, update, and delete are denied");

  const { error: directInsertError } = await visitor.from("card_leads").insert({
    card_id: cardA,
    sender_name: "Direct visitor",
    sender_phone: "+966501234567",
  });
  assert(directInsertError);

  const { error: privilegedRpcError } = await visitor.rpc("create_public_connection", {
    _card_slug: slugA,
    _sender_name: "Privileged visitor",
    _sender_phone: "+966501234567",
    _owner_note: "must fail",
    _status: "done",
    _tags: ["private"],
  });
  assert(privilegedRpcError);
  pass("direct inserts and privileged public fields are denied");

  const invalidCases = [
    ["required name", { _sender_name: "" }],
    ["required phone", { _sender_phone: "" }],
    ["email", { _sender_email: "invalid" }],
    ["name limit", { _sender_name: "n".repeat(101) }],
    ["phone limit", { _sender_phone: "1".repeat(31) }],
    ["company limit", { _sender_company: "c".repeat(161) }],
    ["job title limit", { _sender_job_title: "j".repeat(161) }],
    ["visitor note limit", { _visitor_note: "n".repeat(1001) }],
  ];
  for (const [label, values] of invalidCases) {
    const { error } = await submit(slugA, values);
    assert(error, `${label} should be rejected`);
  }
  pass("database input contract and limits");

  const { error: inactiveError } = await submit(inactiveSlug);
  const { error: missingError } = await submit(`phase01-missing-${suffix}`);
  assert(inactiveError);
  assert(missingError);
  pass("inactive and missing card submissions are rejected");

  await userA.client
    .from("card_leads")
    .update({ owner_note: "free write", status: "done", tags: ["free"] })
    .eq("id", leadA);
  const { data: afterFree, error: afterFreeError } = await admin
    .from("card_leads")
    .select("owner_note,status,tags")
    .eq("id", leadA)
    .single();
  assert.ifError(afterFreeError);
  assert.equal(afterFree.owner_note, null);
  assert.equal(afterFree.status, "new");
  assert.deepEqual(afterFree.tags, []);

  const { error: promoteError } = await admin
    .from("profiles")
    .update({ plan_tier: "pro" })
    .eq("user_id", userA.id);
  assert.ifError(promoteError);
  const { data: managed, error: manageError } = await userA.client
    .from("card_leads")
    .update({ owner_note: "Private follow-up", status: "follow_up", tags: ["conference"] })
    .eq("id", leadA)
    .select("owner_note,status,tags")
    .single();
  assert.ifError(manageError);
  assert.equal(managed.owner_note, "Private follow-up");
  assert.equal(managed.status, "follow_up");
  assert.deepEqual(managed.tags, ["conference"]);
  pass("Free management writes are denied and Pro owner writes succeed");
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
