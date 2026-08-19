// Network layer: fetches a player's games from Lichess or Chess.com. Both take an injectable
// `fetchImpl` (defaulting to the global `fetch`) so client.test.js can exercise the request
// shape, pagination, and error handling without hitting the network — see
// wayfinder/tickets/0001 for why these two endpoints and why a straight `fetch()` is enough
// (both confirmed CORS-open, no backend/proxy needed).

export class UserNotFoundError extends Error {
  constructor(username, platform) {
    super(`No public ${platform} account found for "${username}".`);
    this.name = "UserNotFoundError";
    this.username = username;
    this.platform = platform;
  }
}

function assertNotRateLimited(response, platform) {
  if (response.status === 429) {
    throw new Error(`${platform} is rate-limiting requests right now — please wait a bit and try again.`);
  }
}

/**
 * One request to Lichess's games-export endpoint. Returns the raw NDJSON response text — parse
 * it with engine.js's `parseLichessNdjson`. `speeds`/`rated` are forwarded as server-side filters
 * so a narrower lookup can also mean a smaller download, but the app itself fetches once with no
 * filters and re-filters client-side (ticket 0001) to avoid repeat requests against Lichess's
 * rate limit.
 *
 * This is a single request with no known total up front (Lichess streams the response; we don't
 * know the game count until it's done), so there's no `{completed, total}` to report the way
 * Chess.com's per-month fetch can. If `onProgress` is given, it's instead called with a running
 * count of complete NDJSON lines (= games) seen so far, read straight off the response stream —
 * enough for a live "N games loaded" indicator without waiting for the whole download. If
 * `onGames` is given, it's called once per chunk with the (already-`JSON.parse`d) games that
 * chunk completed — letting a caller show results building up live rather than waiting for the
 * whole download, the way openingtree.com does. A line split across two chunks is buffered and
 * reassembled rather than dropped or double-counted.
 */
export async function fetchLichessGames(
  username,
  { max = 500, speeds, rated, onProgress, onGames } = {},
  fetchImpl = fetch,
) {
  const params = new URLSearchParams({ max: String(max), moves: "true", opening: "true" });
  if (speeds && speeds.length) params.set("perfType", speeds.join(","));
  if (rated === true) params.set("rated", "true");
  if (rated === false) params.set("rated", "false");

  const url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?${params}`;
  const response = await fetchImpl(url, { headers: { Accept: "application/x-ndjson" } });

  if (response.status === 404) throw new UserNotFoundError(username, "Lichess");
  assertNotRateLimited(response, "Lichess");
  if (!response.ok) throw new Error(`Lichess request failed (${response.status})`);

  if (!onProgress && !onGames) return response.text();
  if (!response.body) return response.text();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let lineBuffer = "";
  let gamesSeen = 0;

  const takeCompleteLines = (chunk) => {
    lineBuffer += chunk;
    const lines = lineBuffer.split("\n");
    lineBuffer = lines.pop(); // last element is either "" or an incomplete trailing line
    return lines.map((line) => line.trim()).filter(Boolean);
  };

  const flush = (lines) => {
    if (!lines.length) return;
    gamesSeen += lines.length;
    onProgress?.(gamesSeen);
    onGames?.(lines.map((line) => JSON.parse(line)));
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    text += chunk;
    flush(takeCompleteLines(chunk));
  }

  const finalLine = lineBuffer.trim(); // the stream can end without a trailing newline
  if (finalLine) flush([finalLine]);

  return text;
}

/**
 * Chess.com has no server-side game filtering: list the player's monthly archives, then fetch
 * the most recent `maxMonths` of them (newest first) and concatenate their raw game objects —
 * parse the result with engine.js's `parseChessComGames`. A month that fails to fetch is skipped
 * rather than failing the whole lookup, since one bad month shouldn't hide every other one.
 * Unlike Lichess's single streamed request, the month count is known up front, so `onProgress`
 * (if given) gets a real `{completed, total}` after each month settles — a determinate progress
 * bar, not just an activity indicator. If `onGames` is given, it's called once per month with
 * that month's raw games array as soon as it's fetched, so a caller can show results building up
 * live (newest month first) instead of waiting for every month to finish.
 */
export async function fetchChessComGames(username, { maxMonths = 24, onProgress, onGames } = {}, fetchImpl = fetch) {
  const archivesUrl = `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/games/archives`;
  const archivesResponse = await fetchImpl(archivesUrl);

  if (archivesResponse.status === 404) throw new UserNotFoundError(username, "Chess.com");
  assertNotRateLimited(archivesResponse, "Chess.com");
  if (!archivesResponse.ok) throw new Error(`Chess.com request failed (${archivesResponse.status})`);

  const { archives } = await archivesResponse.json();
  const recentArchivesNewestFirst = archives.slice(-maxMonths).reverse();
  const total = recentArchivesNewestFirst.length;

  const games = [];
  for (const [index, url] of recentArchivesNewestFirst.entries()) {
    const response = await fetchImpl(url);
    if (response.ok) {
      const data = await response.json();
      const monthGames = data.games ?? [];
      games.push(...monthGames);
      if (monthGames.length) onGames?.(monthGames);
    }
    onProgress?.({ completed: index + 1, total });
  }
  return games;
}
