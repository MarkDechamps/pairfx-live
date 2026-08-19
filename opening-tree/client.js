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
 */
export async function fetchLichessGames(username, { max = 500, speeds, rated } = {}, fetchImpl = fetch) {
  const params = new URLSearchParams({ max: String(max), moves: "true", opening: "true" });
  if (speeds && speeds.length) params.set("perfType", speeds.join(","));
  if (rated === true) params.set("rated", "true");
  if (rated === false) params.set("rated", "false");

  const url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?${params}`;
  const response = await fetchImpl(url, { headers: { Accept: "application/x-ndjson" } });

  if (response.status === 404) throw new UserNotFoundError(username, "Lichess");
  assertNotRateLimited(response, "Lichess");
  if (!response.ok) throw new Error(`Lichess request failed (${response.status})`);

  return response.text();
}

/**
 * Chess.com has no server-side game filtering: list the player's monthly archives, then fetch
 * the most recent `maxMonths` of them (newest first) and concatenate their raw game objects —
 * parse the result with engine.js's `parseChessComGames`. A month that fails to fetch is skipped
 * rather than failing the whole lookup, since one bad month shouldn't hide every other one.
 */
export async function fetchChessComGames(username, { maxMonths = 24 } = {}, fetchImpl = fetch) {
  const archivesUrl = `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/games/archives`;
  const archivesResponse = await fetchImpl(archivesUrl);

  if (archivesResponse.status === 404) throw new UserNotFoundError(username, "Chess.com");
  assertNotRateLimited(archivesResponse, "Chess.com");
  if (!archivesResponse.ok) throw new Error(`Chess.com request failed (${archivesResponse.status})`);

  const { archives } = await archivesResponse.json();
  const recentArchivesNewestFirst = archives.slice(-maxMonths).reverse();

  const games = [];
  for (const url of recentArchivesNewestFirst) {
    const response = await fetchImpl(url);
    if (!response.ok) continue;
    const data = await response.json();
    games.push(...(data.games ?? []));
  }
  return games;
}
