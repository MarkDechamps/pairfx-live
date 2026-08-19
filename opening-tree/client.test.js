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
