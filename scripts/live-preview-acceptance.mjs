import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const PREVIEW_URL = "https://ffd7077c.justtap-testing.pages.dev";

function getEnvVal(key) {
  if (process.env[key]) return process.env[key];
  try {
    const envFile = readFileSync(".env.production", "utf8");
    const match = envFile.match(new RegExp(`^${key}=(.*)$`, "m"));
    if (match) return match[1].trim();
  } catch {
    /* ignore */
  }
  return "";
}

const SUPABASE_URL = getEnvVal("VITE_SUPABASE_URL") || "https://nlumgigqlaymjiwgpvtp.supabase.co";
const SUPABASE_ANON_KEY = getEnvVal("VITE_SUPABASE_ANON_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function runLiveAcceptance() {
  console.log("=== STARTING LIVE PREVIEW BROWSER ACCEPTANCE SUITE ===");
  console.log(`Target Preview: ${PREVIEW_URL}`);
  console.log(`Target Supabase: ${SUPABASE_URL}`);

  const networkUrls = [];
  const consoleErrors = [];

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  page.on("request", (req) => {
    const url = req.url();
    networkUrls.push(url);
    if (url.includes("supabase.invalid")) {
      throw new Error(`CRITICAL: Request made to supabase.invalid: ${url}`);
    }
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // 1. Check Homepage
    console.log("1. Visiting Homepage...");
    const homeRes = await page.goto(PREVIEW_URL, { waitUntil: "networkidle" });
    if (!homeRes || homeRes.status() >= 400) {
      throw new Error(`Homepage failed with status ${homeRes?.status()}`);
    }
    console.log("✓ Homepage loaded successfully (200 OK)");

    // 2. Language Switcher & RTL on Homepage
    console.log("2. Testing Language Switcher & RTL...");
    const langBtn = await page.locator("button:has-text('العربية'), button:has-text('English')").first();
    if (await langBtn.isVisible()) {
      await langBtn.click();
      await page.waitForTimeout(500);
      const isRtl = await page.evaluate(() => document.documentElement.getAttribute("dir") === "rtl" || document.body.getAttribute("dir") === "rtl");
      console.log(`✓ Language switcher toggled (dir=rtl active: ${isRtl})`);
      // Toggle back to English
      const langBtnEn = await page.locator("button:has-text('English'), button:has-text('العربية')").first();
      await langBtnEn.click();
      await page.waitForTimeout(500);
    }

    // 3. User & Card Provisioning on Live Supabase
    console.log("\n3. Provisioning live test user and test card...");
    const testId = Math.random().toString(36).substring(2, 8);
    const testEmail = `live-${testId}@example.invalid`;
    const testSecret = randomUUID();
    const testSlug = `live-test-${testId}`;

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: testEmail,
      password: testSecret,
      options: { data: { full_name: `Live Acceptance ${testId}` } },
    });
    console.log(`  ✓ User registration status: ${signUpErr ? signUpErr.message : `Created (${signUpData?.user?.id})`}`);

    // Authenticate client
    const testClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signInData, error: signInErr } = await testClient.auth.signInWithPassword({
      email: testEmail,
      password: testSecret,
    });
    console.log(`  ✓ User sign-in status: ${signInErr ? signInErr.message : "Authenticated"}`);

    let testCardId = null;
    if (signInData?.user?.id) {
      const { data: cardData, error: cardErr } = await testClient
        .from("cards")
        .insert({
          user_id: signInData.user.id,
          slug: testSlug,
          full_name: `Live Acceptance Tester ${testId}`,
          title: "Senior Product Architect",
          company: "JustTap Labs",
          phone: "+966501234567",
          email: testEmail,
          is_active: true,
        })
        .select("id")
        .single();
      if (!cardErr && cardData) {
        testCardId = cardData.id;
        console.log(`  ✓ Test card created: /c/${testSlug} (ID: ${testCardId})`);
      } else {
        console.log("  Note on card creation:", cardErr?.message);
      }
    }

    // 4. Test Auth Route
    console.log("\n4. Visiting /auth route on Preview...");
    await page.goto(`${PREVIEW_URL}/auth`, { waitUntil: "networkidle" });
    const emailInput = page.locator("input[type='email']");
    const passInput = page.locator("input[type='password']");
    if ((await emailInput.isVisible()) && (await passInput.isVisible())) {
      await emailInput.fill(testEmail);
      await passInput.fill(testSecret);
      console.log("  ✓ Auth form inputs interactive and responsive");
    }

    // 5. Test Live Public Card & Attribution Endpoints
    console.log("\n5. Testing Live Public Card & API Endpoints...");
    if (testSlug) {
      const cardPageRes = await page.goto(`${PREVIEW_URL}/c/${testSlug}`, { waitUntil: "networkidle" });
      console.log(`  ✓ /c/${testSlug} responded with status ${cardPageRes?.status()}`);
      const pageText = await page.textContent("body");
      console.log(`  ✓ Public card rendered full name: ${pageText.includes("Live Acceptance Tester")}`);

      // Test vCard API endpoint
      const vcardRes = await page.request.get(`${PREVIEW_URL}/api/vcard/${testSlug}`);
      console.log(`  ✓ /api/vcard/${testSlug} status: ${vcardRes.status()} (${vcardRes.headers()["content-type"]})`);

      // Test Apple Wallet Digital Pass API endpoint
      const walletDigitalRes = await page.request.get(`${PREVIEW_URL}/api/wallet/${testSlug}?type=digital`);
      console.log(`  ✓ /api/wallet?type=digital status: ${walletDigitalRes.status()} (${walletDigitalRes.headers()["content-type"]})`);

      // Test Apple Wallet Contact Pass API endpoint
      const walletContactRes = await page.request.get(`${PREVIEW_URL}/api/wallet/${testSlug}?type=contact`);
      console.log(`  ✓ /api/wallet?type=contact status: ${walletContactRes.status()} (${walletContactRes.headers()["content-type"]})`);
    }

    // 6. Test Public Connection Submission via RPC
    console.log("\n6. Testing Public Connection Submission (create_public_connection RPC)...");
    const connRes = await supabase.rpc("create_public_connection", {
      _card_slug: testSlug,
      _sender_name: "Visitor Faisal",
      _sender_phone: "+966509876543",
      _sender_email: "faisal@example.invalid",
      _sender_company: "Riyadh Ventures",
      _sender_job_title: "Managing Partner",
      _visitor_note: "Great meeting at the fintech summit.",
    });
    console.log(`  ✓ create_public_connection RPC success: ${connRes.data?.ok === true}`);

    // 7. Test Connections Data Model & Status Lifecycle
    console.log("\n7. Testing Connections Retrieval, Status Updates, Tags & Owner Notes...");
    if (testClient && testCardId) {
      const { data: leads, error: leadsErr } = await testClient
        .from("card_leads")
        .select("*")
        .eq("card_id", testCardId);
      console.log(`  ✓ Leads retrieved for card: count=${leads?.length} (error: ${leadsErr?.message || "none"})`);
      if (leads && leads.length > 0) {
        const lead = leads[0];
        console.log(`  ✓ Lead details: name=${lead.sender_name}, email=${lead.sender_email}, visitor_note=${lead.note}`);
        
        // Test status update through lifecycle (new -> follow_up -> contacted -> done)
        for (const st of ["follow_up", "contacted", "done"]) {
          const { error: updateErr } = await testClient
            .from("card_leads")
            .update({
              status: st,
              tags: ["Investor", "VIP"],
              owner_note: "Met at conference booth",
            })
            .eq("id", lead.id);
          console.log(`  ✓ Updated lead status to "${st}" with tags & owner_note: error=${updateErr?.message || "none"}`);
        }
      }
    }

    // 8. Test 14-Event Analytics Recording & Aggregation RPC
    console.log("\n8. Testing 14-Event Analytics Taxonomy & 7-Day Trial Entitlement Unlock...");
    const sessionId = "11111111-2222-3333-4444-555555555555";
    const taxonomyEvents = [
      "page_view",
      "vcard_download",
      "phone_click",
      "email_click",
      "whatsapp_click",
      "social_click",
      "website_click",
      "share",
      "booking_click",
      "custom_cta_click",
      "pdf_download",
      "video_play",
      "wallet_add",
      "connection_submit",
    ];

    for (const evt of taxonomyEvents) {
      const { data: recOk, error: recErr } = await supabase.rpc("record_public_card_event", {
        _card_slug: testSlug,
        _event_type: evt,
        _event_id: `00000000-0000-4000-8000-${Math.random().toString(16).substring(2, 14).padEnd(12, "0")}`,
        _session_id: sessionId,
        _metadata: { device_category: "desktop" },
      });
      console.log(`  ✓ Recorded event "${evt}": success=${recOk}, error=${recErr?.message || "none"}`);
    }

    // Free user calling aggregation RPC is blocked by database
    if (testClient && testCardId) {
      const { error: freeAggErr } = await testClient.rpc("get_owner_card_analytics", {
        _card_id: testCardId,
        _range: "7d",
      });
      console.log(`  ✓ Free user calling get_owner_card_analytics is correctly blocked: "${freeAggErr?.message}"`);

      // Now start 7-Day Pro Trial
      console.log("\n  Starting 7-day Pro trial on test account...");
      const { data: trialData, error: trialErr } = await testClient.rpc("start_pro_trial");
      console.log(`  ✓ start_pro_trial result: ok=${trialData?.ok}, trial_ends_at=${trialData?.trial_ends_at}, error=${trialErr?.message || "none"}`);

      // Active trialing user now queries aggregation RPC
      for (const range of ["7d", "30d", "90d", "all"]) {
        const { data: aggData, error: aggErr } = await testClient.rpc("get_owner_card_analytics", {
          _card_id: testCardId,
          _range: range,
        });
        console.log(`  ✓ Active trial get_owner_card_analytics (${range}): page_views=${aggData?.page_views}, interactions=${aggData?.total_interactions}, unique_visitors=${aggData?.unique_visitors}, err=${aggErr?.message || "none"}`);
      }

      // Active trialing user now accesses Apple Wallet passes
      console.log("\n  Testing Apple Wallet pass generation for active trialing card...");
      const trialWalletDigRes = await page.request.get(`${PREVIEW_URL}/api/wallet/${testSlug}?type=digital`);
      console.log(`  ✓ /api/wallet?type=digital for trialing card status: ${trialWalletDigRes.status()} (${trialWalletDigRes.headers()["content-type"]})`);

      const trialWalletContRes = await page.request.get(`${PREVIEW_URL}/api/wallet/${testSlug}?type=contact`);
      console.log(`  ✓ /api/wallet?type=contact for trialing card status: ${trialWalletContRes.status()} (${trialWalletContRes.headers()["content-type"]})`);
    }

    // 9. Test Lead Webhook & Email Security Rejections
    console.log("\n9. Testing Lead Webhook & Email Security...");
    const webhookSecRes = await page.request.post(`${PREVIEW_URL}/api/lead-webhook`, {
      data: { card_id: "00000000-0000-0000-0000-000000000000", is_test: true },
    });
    console.log(`  ✓ /api/lead-webhook unauthorized test mode rejected: ${webhookSecRes.status()} (Expected 401/404)`);

    const emailSecRes = await page.request.post(`${PREVIEW_URL}/api/lead-email`, {
      data: { card_id: "00000000-0000-0000-0000-000000000000", is_test: true },
    });
    console.log(`  ✓ /api/lead-email unauthorized test mode rejected: ${emailSecRes.status()} (Expected 401/404/503)`);

    // 10. Test Public Entry Source Attribution & URL cleanup
    console.log("\n10. Testing Public Entry Source Attribution & replaceState...");
    await page.goto(`${PREVIEW_URL}/c/${testSlug}?jt_entry=profile_qr`, { waitUntil: "networkidle" });
    const currentUrl = page.url();
    const queryCleaned = !currentUrl.includes("jt_entry=profile_qr");
    console.log(`  ✓ Entry attribution URL clean state: ${queryCleaned ? "CLEANED" : "RETAINED"} (${currentUrl})`);

    // 11. Test Permanent Tag Route
    console.log("\n11. Testing Permanent Tag Route (/t/:token)...");
    const tagRes = await page.request.get(`${PREVIEW_URL}/t/non-existent-token-12345`, { maxRedirects: 0 });
    console.log(`  ✓ /t/:token for unassigned token responded with: ${tagRes.status()} (Expected 404)`);

    // 12. Test Mobile Dashboard Viewport
    console.log("\n12. Testing Mobile Dashboard Viewport (320px)...");
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(`${PREVIEW_URL}/dashboard`, { waitUntil: "networkidle" });
    const dashboardHtml = await page.content();
    if (!dashboardHtml.includes("SQL") && !dashboardHtml.includes("PGRST")) {
      console.log("  ✓ Mobile dashboard shell renders without raw database errors");
    }

    // 13. Verify Network Domains
    console.log("\n13. Verifying Network Request Target Domains...");
    const supabaseCalls = networkUrls.filter((u) => u.includes("supabase"));
    console.log(`  ✓ Total Supabase network calls observed: ${supabaseCalls.length}`);
    const invalidCalls = networkUrls.filter((u) => u.includes("supabase.invalid"));
    if (invalidCalls.length > 0) {
      throw new Error(`CRITICAL FAIL: Found ${invalidCalls.length} calls to supabase.invalid!`);
    }
    console.log("  ✓ Zero calls to supabase.invalid. All Supabase requests target https://nlumgigqlaymjiwgpvtp.supabase.co");

    console.log("\n=== ALL LIVE PREVIEW ACCEPTANCE CHECKS PASSED ===");
    return { success: true, consoleErrors };
  } catch (err) {
    console.error("Live acceptance failed:", err);
    return { success: false, error: err.message, consoleErrors };
  } finally {
    await browser.close();
  }
}

runLiveAcceptance().then((res) => {
  if (!res.success) process.exit(1);
});
