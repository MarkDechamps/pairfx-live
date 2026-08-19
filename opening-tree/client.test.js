import test from "node:test";
import assert from "node:assert/strict";
import { fetchLichessGames, fetchChessComGames, UserNotFoundError } from "./client.js";

function fakeFetch(handler) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

function textResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, text: async () => body };
}

// A response whose body streams in the given chunks — lets fetchLichessGames's progress path
// (which reads response.body incrementally) be exercised without a real network stream.
function streamedResponse(chunks, { ok = true, status = 200 } = {}) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return { ok, status, body, text: async () => chunks.join("") };
}

// ---------------------------------------------------------------------------
// fetchLichessGames
// ---------------------------------------------------------------------------

test("fetchLichessGames requests the export endpoint with moves/opening enabled and an ndjson Accept header", async () => {
  const fetchImpl = fakeFetch(() => textResponse("line1\nline2"));

  const text = await fetchLichessGames("SomePlayer", {}, fetchImpl);

  assert.equal(text, "line1\nline2");
  assert.equal(fetchImpl.calls.length, 1);
  const { url, init } = fetchImpl.calls[0];
  assert.ok(url.startsWith("https://lichess.org/api/games/user/SomePlayer?"));
  assert.match(url, /moves=true/);
  assert.match(url, /opening=true/);
  assert.equal(init.headers.Accept, "application/x-ndjson");
});

test("fetchLichessGames forwards max/speeds/rated as query params", async () => {
  const fetchImpl = fakeFetch(() => textResponse(""));

  await fetchLichessGames("p", { max: 50, speeds: ["blitz", "rapid"], rated: true }, fetchImpl);

  const { url } = fetchImpl.calls[0];
  assert.match(url, /max=50/);
  assert.match(url, /perfType=blitz%2Crapid/);
  assert.match(url, /rated=true/);
});

test("fetchLichessGames throws UserNotFoundError on a 404", async () => {
  const fetchImpl = fakeFetch(() => textResponse("", { ok: false, status: 404 }));

  await assert.rejects(() => fetchLichessGames("ghost", {}, fetchImpl), UserNotFoundError);
});

test("fetchLichessGames throws a plain Error on other failures", async () => {
  const fetchImpl = fakeFetch(() => textResponse("", { ok: false, status: 500 }));

  await assert.rejects(() => fetchLichessGames("p", {}, fetchImpl), /500/);
});

test("fetchLichessGames gives a specific message on a 429 (real users can hit this too)", async () => {
  const fetchImpl = fakeFetch(() => textResponse("", { ok: false, status: 429 }));

  await assert.rejects(() => fetchLichessGames("p", {}, fetchImpl), /rate.?limit/i);
});

test("fetchLichessGames reports how many games have streamed in so far, when given onProgress", async () => {
  const line = (id) => JSON.stringify({ id }) + "\n";
  const fetchImpl = fakeFetch(() =>
    streamedResponse([line("a") + line("b"), line("c")]),
  );
  const seen = [];

  const text = await fetchLichessGames("p", { onProgress: (n) => seen.push(n) }, fetchImpl);

  assert.equal(text, line("a") + line("b") + line("c"));
  // first chunk contains 2 complete lines, second chunk 1 more
  assert.deepEqual(seen, [2, 3]);
});

test("fetchLichessGames without onProgress still just returns the full text (unchanged behavior)", async () => {
  const fetchImpl = fakeFetch(() => streamedResponse(["line1\n", "line2\n"]));

  const text = await fetchLichessGames("p", {}, fetchImpl);

  assert.equal(text, "line1\nline2\n");
});

// ---------------------------------------------------------------------------
// fetchChessComGames
// ---------------------------------------------------------------------------

test("fetchChessComGames fetches archives most-recent-first and concatenates their games", async () => {
  const archives = [
    "https://api.chess.com/pub/player/p/games/2023/12",
    "https://api.chess.com/pub/player/p/games/2024/01",
    "https://api.chess.com/pub/player/p/games/2024/02",
  ];
  const fetchImpl = fakeFetch((url) => {
    if (url.endsWith("/archives")) return jsonResponse({ archives });
    if (url.endsWith("2024/02")) return jsonResponse({ games: [{ id: "feb" }] });
    if (url.endsWith("2024/01")) return jsonResponse({ games: [{ id: "jan" }] });
    return jsonResponse({ games: [{ id: "dec" }] });
  });

  const games = await fetchChessComGames("p", {}, fetchImpl);

  assert.deepEqual(games, [{ id: "feb" }, { id: "jan" }, { id: "dec" }]);
  // archives list first, then most-recent month first
  assert.equal(fetchImpl.calls[1].url, archives[2]);
  assert.equal(fetchImpl.calls[2].url, archives[1]);
  assert.equal(fetchImpl.calls[3].url, archives[0]);
});

test("fetchChessComGames reports {completed, total} as each month is fetched, when given onProgress", async () => {
  const archives = [
    "https://api.chess.com/pub/player/p/games/2024/01",
    "https://api.chess.com/pub/player/p/games/2024/02",
    "https://api.chess.com/pub/player/p/games/2024/03",
  ];
  const fetchImpl = fakeFetch((url) => {
    if (url.endsWith("/archives")) return jsonResponse({ archives });
    return jsonResponse({ games: [] });
  });
  const seen = [];

  await fetchChessComGames("p", { onProgress: (p) => seen.push(p) }, fetchImpl);

  assert.deepEqual(seen, [
    { completed: 1, total: 3 },
    { completed: 2, total: 3 },
    { completed: 3, total: 3 },
  ]);
});

test("fetchChessComGames caps how many months back it fetches via maxMonths", async () => {
  const archives = Array.from(
    { length: 5 },
    (_, i) => `https://api.chess.com/pub/player/p/games/2024/0${i + 1}`,
  );
  const fetchImpl = fakeFetch((url) => {
    if (url.endsWith("/archives")) return jsonResponse({ archives });
    return jsonResponse({ games: [] });
  });

  await fetchChessComGames("p", { maxMonths: 2 }, fetchImpl);

  // 1 call for the archives list + 2 month calls, not 5
  assert.equal(fetchImpl.calls.length, 3);
});

test("fetchChessComGames throws UserNotFoundError when the archives list 404s", async () => {
  const fetchImpl = fakeFetch(() => jsonResponse({}, { ok: false, status: 404 }));

  await assert.rejects(() => fetchChessComGames("ghost", {}, fetchImpl), UserNotFoundError);
});

test("fetchChessComGames gives a specific message when the archives list is rate-limited", async () => {
  const fetchImpl = fakeFetch(() => jsonResponse({}, { ok: false, status: 429 }));

  await assert.rejects(() => fetchChessComGames("p", {}, fetchImpl), /rate.?limit/i);
});

test("fetchChessComGames skips a month that fails instead of aborting the whole lookup", async () => {
  const archives = [
    "https://api.chess.com/pub/player/p/games/2024/01",
    "https://api.chess.com/pub/player/p/games/2024/02",
  ];
  const fetchImpl = fakeFetch((url) => {
    if (url.endsWith("/archives")) return jsonResponse({ archives });
    if (url.endsWith("2024/02")) return jsonResponse({}, { ok: false, status: 500 });
    return jsonResponse({ games: [{ id: "jan" }] });
  });

  const games = await fetchChessComGames("p", {}, fetchImpl);
  assert.deepEqual(games, [{ id: "jan" }]);
});

test("fetchChessComGames lowercases the username in the archives URL", async () => {
  const fetchImpl = fakeFetch(() => jsonResponse({ archives: [] }));

  await fetchChessComGames("MixedCase", {}, fetchImpl);

  assert.match(fetchImpl.calls[0].url, /player\/mixedcase\/games\/archives/);
});
