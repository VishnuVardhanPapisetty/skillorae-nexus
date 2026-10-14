const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const baseUrl = process.env.NEXUS_BASE_URL || "http://localhost:3000";

test("low thinking is configured for chat only", () => {
  const routeSource = fs.readFileSync(
    path.join(__dirname, "../app/api/nexus-explanation/route.ts"),
    "utf8",
  );
  const chatConfigStart = routeSource.indexOf("const chatRequest = {");
  const chatCallsStart = routeSource.indexOf("let response:", chatConfigStart);
  const reportStart = routeSource.indexOf(
    "const reportStartedAt =",
    chatCallsStart,
  );
  const reportEnd = routeSource.indexOf(
    "const explanation = response.text?.trim();",
    reportStart,
  );

  assert.notEqual(chatConfigStart, -1);
  assert.notEqual(chatCallsStart, -1);
  assert.notEqual(reportStart, -1);
  assert.notEqual(reportEnd, -1);

  const chatConfig = routeSource.slice(chatConfigStart, chatCallsStart);
  const chatCalls = routeSource.slice(chatCallsStart, reportStart);
  const reportGeneration = routeSource.slice(reportStart, reportEnd);

  assert.match(
    chatConfig,
    /thinkingConfig:\s*\{\s*thinkingLevel:\s*ThinkingLevel\.LOW\s*\}/,
  );
  assert.match(
    chatCalls,
    /model:\s*"gemini-3\.8-flash"[\s\S]*?\.\.\.chatRequest/,
  );
  assert.match(
    chatCalls,
    /model:\s*"gemini-3\.7-flash"[\s\S]*?\.\.\.chatRequest/,
  );
  assert.doesNotMatch(reportGeneration, /thinkingConfig/);
  assert.match(reportGeneration, /model:\s*"gemini-3\.8-flash"/);
  assert.match(reportGeneration, /maxOutputTokens:\s*800/);
  assert.match(reportGeneration, /temperature:\s*0\.4/);
});

const routes = [
  "/",
  "/analyze",
  "/career",
  "/Dashboard",
  "/faculty",
  "/faculty/login",
  "/student/login",
  "/skill-gaps",
  "/recommendations",
  "/roadmap",
  "/quiz",
  "/simulation",
];

for (const route of routes) {
  test(`GET ${route} responds successfully`, async () => {
    const response = await fetch(new URL(route, baseUrl), {
      redirect: "manual",
    });

    assert.equal(
      response.status,
      200,
      `${route} returned HTTP ${response.status}`,
    );
  });
}

test("POST /api/nexus-explanation rejects unauthenticated requests", async () => {
  const response = await fetch(new URL("/api/nexus-explanation", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile: {}, analysis: {} }),
  });

  assert.equal(response.status, 401);
});

test("POST /api/nexus-explanation rejects unauthenticated chat requests", async () => {
  const response = await fetch(new URL("/api/nexus-explanation", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "chat",
      messages: [{ role: "user", content: "Help me plan my next step." }],
      context: { studentId: "untrusted-client-value" },
    }),
  });

  assert.equal(response.status, 401);
});

test("GET /api/faculty/analytics rejects unauthenticated roster requests", async () => {
  const response = await fetch(new URL("/api/faculty/analytics", baseUrl), {
    redirect: "manual",
  });

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("POST /api/faculty/analytics rejects unauthenticated record updates", async () => {
  const response = await fetch(new URL("/api/faculty/analytics", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: "untrusted-client-value",
      attendance_percentage: 90,
      marks_percentage: 80,
      assignment_completion_percentage: 75,
    }),
  });

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
