const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PerProcessUserRateLimiter,
  readJsonRequestBody,
} = require("../node_modules/.cache/ai-security-test-build/ai-request-guards.js");

function makeRequest(body, headers = {}) {
  return new Request("http://nexus.test/api/nexus-explanation", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}

test("reads valid JSON within the byte limit", async () => {
  const value = { message: "Help me plan." };
  const result = await readJsonRequestBody(makeRequest(JSON.stringify(value)));

  assert.deepEqual(result, { ok: true, value });
});

test("rejects an oversized streamed JSON body with 413 using UTF-8 byte size", async () => {
  const body = JSON.stringify({ message: "🔥".repeat(20) });
  const maxBytes = Buffer.byteLength(body, "utf8") - 1;
  const result = await readJsonRequestBody(makeRequest(body), maxBytes);

  assert.equal(result.ok, false);
  assert.equal(result.status, 413);
});

test("rejects malformed JSON with 400", async () => {
  const result = await readJsonRequestBody(makeRequest("{"));

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test("rate limits each user independently and resets the fixed window", () => {
  const limiter = new PerProcessUserRateLimiter(2, 1000, 10);

  assert.deepEqual(limiter.consume("student-a", 0), {
    allowed: true,
    remaining: 1,
  });
  assert.deepEqual(limiter.consume("student-a", 100), {
    allowed: true,
    remaining: 0,
  });
  assert.deepEqual(limiter.consume("student-a", 200), {
    allowed: false,
    retryAfterSeconds: 1,
  });
  assert.deepEqual(limiter.consume("student-b", 200), {
    allowed: true,
    remaining: 1,
  });
  assert.deepEqual(limiter.consume("student-a", 1000), {
    allowed: true,
    remaining: 1,
  });
});

test("fails closed when the bounded limiter cannot track another user", () => {
  const limiter = new PerProcessUserRateLimiter(2, 1000, 1);

  assert.equal(limiter.consume("student-a", 0).allowed, true);
  assert.deepEqual(limiter.consume("student-b", 1), {
    allowed: false,
    unavailable: true,
  });
  assert.deepEqual(limiter.consume("", 1), {
    allowed: false,
    unavailable: true,
  });
});
