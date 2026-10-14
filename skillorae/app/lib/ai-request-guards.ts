export const MAX_AI_REQUEST_BYTES = 64 * 1024;

export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413; error: string };

export async function readJsonRequestBody(
  request: Request,
  maxBytes = MAX_AI_REQUEST_BYTES,
): Promise<JsonBodyResult> {
  const contentLength = request.headers.get("content-length");

  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) {
      return { ok: false, status: 400, error: "Invalid request body length." };
    }
    if (declaredLength > maxBytes) {
      return {
        ok: false,
        status: 413,
        error: "Request body exceeds the 64 KiB limit.",
      };
    }
  }

  if (!request.body) {
    return {
      ok: false,
      status: 400,
      error: "A JSON request body is required.",
    };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // The request may already be aborted.
        }
        return {
          ok: false,
          status: 413,
          error: "Request body exceeds the 64 KiB limit.",
        };
      }

      chunks.push(value);
    }
  } catch {
    return {
      ok: false,
      status: 400,
      error: "Unable to read the request body.",
    };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return {
      ok: true,
      value: JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      ),
    };
  } catch {
    return {
      ok: false,
      status: 400,
      error: "Request body must contain valid JSON.",
    };
  }
}

export type RateLimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number }
  | { allowed: false; unavailable: true };

type UserWindow = {
  startedAt: number;
  requestCount: number;
};

export class PerProcessUserRateLimiter {
  private readonly windows = new Map<string, UserWindow>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
    private readonly maxTrackedUsers: number,
  ) {}

  consume(userId: string, now = Date.now()): RateLimitDecision {
    if (
      !userId ||
      !Number.isInteger(this.maxRequests) ||
      this.maxRequests < 1 ||
      !Number.isFinite(this.windowMs) ||
      this.windowMs < 1 ||
      !Number.isInteger(this.maxTrackedUsers) ||
      this.maxTrackedUsers < 1
    ) {
      return { allowed: false, unavailable: true };
    }

    for (const [trackedUserId, window] of this.windows) {
      if (now - window.startedAt >= this.windowMs) {
        this.windows.delete(trackedUserId);
      }
    }

    const current = this.windows.get(userId);
    if (!current) {
      if (this.windows.size >= this.maxTrackedUsers) {
        return { allowed: false, unavailable: true };
      }

      this.windows.set(userId, { startedAt: now, requestCount: 1 });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    if (current.requestCount >= this.maxRequests) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((current.startedAt + this.windowMs - now) / 1000),
        ),
      };
    }

    current.requestCount += 1;
    return {
      allowed: true,
      remaining: this.maxRequests - current.requestCount,
    };
  }
}

// This store is bounded and fail-closed, but is local to one server process.
export const aiRequestRateLimiter = new PerProcessUserRateLimiter(
  10,
  60_000,
  10_000,
);
