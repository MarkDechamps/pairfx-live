# Research: Data sourcing options for the opening dataset

Findings for ticket [0001-data-sourcing-options.md](../tickets/0001-data-sourcing-options.md).
Research conducted 2026-07-28. All sources below were fetched directly (via `curl` with a
browser user-agent and/or the WebFetch tool) on that date; nothing here is a secondhand summary
of a blog post about these sources.

## Sources checked

| # | Source | URL | Checked | Result |
|---|--------|-----|---------|--------|
| 1 | 365chess.com robots.txt | https://www.365chess.com/robots.txt | 2026-07-28 | Fetched (200) |
| 2 | 365chess.com openings landing page | https://www.365chess.com/chess-openings | 2026-07-28 | Fetched (200) |
| 3 | 365chess.com Terms of Service | https://www.365chess.com/view/terms-of-service | 2026-07-28 | Fetched (200). Note: `/terms.php` (the URL suggested in the ticket) returns 404 — that's a legacy/alias path, the live ToS lives at `/view/terms-of-service`. |
| 4 | 365chess.com homepage (footer/copyright check) | https://www.365chess.com/ | 2026-07-28 | Fetched (200) |
| 5 | 365chess.com Opening Explorer | https://www.365chess.com/opening.php | 2026-07-28 | Fetched (200) |
| 6 | Wikipedia — List of chess openings | https://en.wikipedia.org/wiki/List_of_chess_openings | 2026-07-28 | Fetched (200) |
| 7 | Wikipedia — Encyclopaedia of Chess Openings | https://en.wikipedia.org/wiki/Encyclopaedia_of_Chess_Openings | 2026-07-28 | Fetched (200) |
| 8 | Wikipedia — Copyrights policy | https://en.wikipedia.org/wiki/Wikipedia:Copyrights | 2026-07-28 | Fetched (200) |
| 9 | Lichess API docs (SPA shell only) | https://lichess.org/api | 2026-07-28 | Fetched (200) but is a JS SPA shell with no server-rendered content; see #10/#11 for the actual spec. |
| 10 | Lichess API OpenAPI spec (source of truth) | https://raw.githubusercontent.com/lichess-org/api/master/doc/specs/lichess-api.yaml and the referenced `tags/openingexplorer/masters.yaml` + `schemas/OpeningExplorerMasters.yaml` + `schemas/OpeningExplorerOpening.yaml` | 2026-07-28 | Fetched (200) |
| 11 | Lichess Opening Explorer live endpoint | https://explorer.lichess.org/masters?play=e2e4,e7e5,g1f3,b8c6,f1b5 (and the legacy alias `explorer.lichess.ovh`) | 2026-07-28 | **Blocked** — returned `401 Authorization Required` from both `curl` and the WebFetch tool. See caveat below. |
| 12 | Lichess open database | https://database.lichess.org | 2026-07-28 | Fetched (200) |
| 13 | chess.com Published-Data API docs | https://www.chess.com/news/view/published-data-api | 2026-07-28 | Fetched (200) |
| 14 | lichess-org/chess-openings repo (README) | https://github.com/lichess-org/chess-openings | 2026-07-28 | Fetched (200) |
| 15 | lichess-org/chess-openings license (GitHub API metadata) | https://api.github.com/repos/lichess-org/chess-openings | 2026-07-28 | Fetched (200), `license.spdx_id: CC0-1.0` confirmed directly from GitHub's own repo metadata, not just the README's prose claim |

## Findings per source

### 1–5. 365chess.com

**robots.txt** (raw contents fetched via `curl`): there is **no blanket disallow** on `/chess-openings` or the general `/opening.php` explorer page. However, robots.txt *does* disallow crawling of several opening/database-adjacent paths specifically:
```
Disallow: /opening.php?master=*
Disallow: /opening.php?m=*&n=&ms*
Disallow: /opening.php?m=8*  ... through  Disallow: /opening.php?m=17*
Disallow: /view_opening.php*
Disallow: /eco.php?list=*
Disallow: /eco/*/games*
Disallow: /download.php
Disallow: /downloadp.php
```
Reading these together: the *first* screen of the Opening Explorer (bare `/opening.php`) and the static `/chess-openings` landing page are crawlable, but 365chess explicitly walls off deep-linked variation pages, bulk ECO listing views (`eco.php?list=`), game-listing-per-ECO-code pages, and anything with a download intent. That's a fairly clear signal that they're fine with search engines indexing top-level pages but don't want bulk/automated harvesting of their compiled position database or game archive.

**Terms of Service** (`/view/terms-of-service`, entity is "365Engage LLC dba 365Chess"): read the full document (159 lines of body text after stripping markup). It covers account/membership terms, subscription auto-renewal, refund policy (90-day, courses), and a liability/warranty disclaimer. **It contains no explicit clause about site content copyright, database rights, or a prohibition on scraping/reuse of their data.** The only "intellectual property" mentions are about *user-uploaded* content (clause 8, warranting that what a user uploads doesn't infringe someone else's IP) — not about 365Chess's own content. This is a real, verified finding, not an assumption: the ToS is simply silent on this specific question.

**Homepage/footer**: no visible `©`, "copyright", "all rights reserved" text anywhere in the rendered homepage HTML. The footer only links to Terms of Service and Privacy Policy, no explicit copyright notice.

**`/chess-openings` page content**: this is a curated, prose-heavy page — original written explanations ("The move 1.e4 was favored by ... Bobby Fischer... aims to control key squares like d5 and f5..."), a stated Open/Semi-Open/Closed categorization scheme, and per-opening name + move sequence (e.g. "Ruy Lopez (Spanish Opening) — 1.e4 e5 2.Nf3 Nc6 3.Bb5"). **No ECO codes and no win/draw/loss stats appear on this specific page** — it's a hand-written index/guide, not a data table.

**`/opening.php` Opening Explorer**: this *is* a real statistics product. The first-move screen returns embedded JSON with, per candidate move, `white`/`black`/`draw` percentages, `white_elo`/`black_elo` averages, and `count_games` (e.g. 1.e4: 1,922,835 games, 37.9% white win rate) — clearly aggregated from 365chess's own game database. This is exactly the kind of curated statistical compilation that (independent of the ECO facts themselves) represents original database/compilation effort by 365chess.

**Conclusion on 365chess viability**: no explicit "no scraping" clause exists in their ToS, and robots.txt permits crawling the top-level openings/explorer pages — so there is no *robots.txt or ToS violation* in merely visiting these pages. But that is a different question from whether it's advisable to **scrape and republish** their content in this project's dataset. Two things on that page are 365chess's own original work, not raw facts: (a) the prose write-ups/categorizations on `/chess-openings`, and (b) the aggregated win/draw/loss/Elo statistics on `/opening.php`, which are a compiled database product built from their proprietary game corpus. Copying either into this project's dataset would be republishing 365chess's specific expression/compilation, not just the underlying ECO facts. **Recommendation: do not scrape or republish 365chess's prose or its Opening Explorer statistics.** The abstract facts "this opening is named X and is classified under ECO code Y" are not 365chess's to own — they originate from the ECO system itself (see below) — so it's fine to *independently* record an opening's name, ECO code, and canonical move order using ECO/Wikipedia/Lichess as the source of record, even if 365chess happens to display the same facts.

### 6–7. Wikipedia — List of chess openings / ECO

**List of chess openings** (https://en.wikipedia.org/wiki/List_of_chess_openings): fetched the raw HTML directly. The page is structured as a **table of ECO codes** (A00–E99), one row per code, with columns for the **ECO code**, the **move sequence** in algebraic notation (e.g. "1.e4 e5 2.Nf3 Nc6 3.Bc4" for C50 — the Italian Game), and a **name/main-article link** column when the code has a named opening (many finer-grained codes have no distinct name, just a move sequence). Verified directly in the fetched markup, e.g.:
```
C50  1.e4 e5 2.Nf3 Nc6 3.Bc4  Italian Game
C25  1.e4 e5 2.Nc3            Vienna Game
```
Confirmed coverage is the full A00–E99 range (~500 codes total, per the ECO article below), organized into five sections (A–E) matching the five ECO volumes.

**Encyclopaedia of Chess Openings article**: confirms the ECO classification was created and originally published by **Šahovski Informator ("Chess Informant"), Yugoslavia, in five volumes 1974–1979** (chief editor Aleksandar Matanović) — i.e. the classification system predates and is independent of 365chess.com, chess.com, or Lichess; all of those sites are just displaying/using a pre-existing public reference taxonomy. The article also notes "ECO code" is a registered trademark of Chess Informant, though the codes themselves (A00–E99) function as a de facto open nomenclature used across the entire chess-publishing industry, similarly to how a taxonomic naming scheme functions as a fact-based reference despite having an original publisher.

**No style/complexity/rating-suitability data**: explicitly checked — the ECO table has exactly three kinds of columns (code / moves / name-link); there is no column or section for aggressive/positional/gambit tags, complexity, or rating-band suitability. Any such characterization only exists in the free-text prose of the *individual* per-opening Wikipedia articles (e.g. the Sicilian Defence or Ruy Lopez articles), not in the structured list.

**Wikipedia licensing** (Wikipedia:Copyrights, fetched directly): Wikipedia text is dual/primarily licensed under **CC BY-SA 4.0** (older, pre-June-2009 content also under GFDL). Reuse requires: attribution (a hyperlink to the source article, a URL to an attributing mirror, or a list of contributors), and a **share-alike** obligation — any modified/derived version of the *text* must be released under the same CC BY-SA license. This applies to prose you copy or adapt; it does **not** apply to the underlying facts (an opening's name, ECO code, and standard move order are facts, not Wikipedia's copyrightable expression) — but if this project quotes or closely paraphrases Wikipedia's descriptive prose (e.g. for style commentary), attribution + share-alike kick in for that copied/adapted text.

### 9–12. Lichess

**Opening Explorer API** — confirmed via the official OpenAPI spec (`lichess-org/api` GitHub repo, fetched directly, not a secondary summary):
- Documented public endpoints: `https://explorer.lichess.org/masters`, `/lichess`, `/player`, and `/master/pgn/{gameId}`.
- The `/masters` endpoint takes `fen`, `play` (UCI move sequence), `since`/`until` (year range filter), `moves` (how many top moves to return), `topGames`.
- Response schema (`OpeningExplorerMasters.yaml`, fetched directly): `opening` (nested `OpeningExplorerOpening` object with **`eco`** and **`name`** string fields, confirmed via schema), plus root-level `white`/`draws`/`black` game counts, and a `moves[]` array where each move carries `uci`, `san`, `averageRating`, `white`/`draws`/`black` counts, a linked `game`, and its own nested `opening`. This is exactly opening name + ECO code + move + real win/draw/loss popularity stats, sourced from actual master-level games.
- **Live-query caveat**: I attempted to actually call `https://explorer.lichess.org/masters?play=e2e4,e7e5,g1f3,b8c6,f1b5` (and the older `explorer.lichess.ovh` alias) with both `curl` and the WebFetch tool. Both returned `401 Authorization Required` (nginx-level response) in this environment. I could not determine from the OpenAPI spec alone whether this reflects a genuine current auth requirement on the live service, a temporary/rate-limit block, or a network restriction specific to this sandbox — I did **not** fabricate a JSON response. The **field-level facts above are still confirmed**, because they come from the project's own published OpenAPI schema files on GitHub (which *did* fetch successfully), just not from a live response body. Before relying on this API in ticket 0004, someone with unrestricted network access should re-verify the live call succeeds and check current auth/rate-limit requirements.
- **Licensing**: https://database.lichess.org (fetched directly) states Lichess's downloadable database exports (games, puzzles, evaluations) are released under **CC0** — "Use them for research, commercial purpose, publication, anything you like... without asking for permission." The Opening Explorer is a live query service over this same underlying public game data, so its output should carry the same public-domain posture, though the CC0 statement on database.lichess.org is specifically about the downloadable dumps, not a separate explicit license grant for the live API's JSON output — a reasonable inference, not a directly-quoted guarantee for the API itself.
- **No style/complexity tags**: the schema has no field for playing style, complexity, or rating-suitability — only name, ECO, moves, and win/draw/loss/rating stats.

**lichess-org/chess-openings dataset** (GitHub): this is a static, versioned dataset — TSV files per ECO volume (`a.tsv`...`e.tsv`), each row giving `eco` (code), `name` (title-cased opening name), and `pgn` (a well-known move sequence reaching that position, in SAN); a generated `dist/` build additionally provides `uci` and `epd`/FEN. The README states plainly "As a collection of facts, this data set is in the public domain," and the repo is released under **CC0-1.0** — confirmed independently via GitHub's own repository metadata API (`license.spdx_id: "CC0-1.0"`), not just the README's self-description. No popularity/win-rate stats and no style/complexity tags in this dataset — it is purely name + ECO + canonical move sequence.

### 13. chess.com Published-Data API

Fetched the official announcement/docs page. The API is organized around **player, club, tournament, team-match, and country** resources (profiles, game archives in PGN, leaderboards, puzzles). Individual game records expose an optional `"eco"` field, but it is a **URL pointing to a chess.com ECO opening page**, not a structured opening name/code/stat object. There is **no dedicated opening-explorer, ECO-lookup, or opening-database endpoint** in the public API — confirming the ticket's expectation. The docs also ask API users to "respect [chess.com's] IP" around board/piece art and other product features, which is a soft usage constraint but not directly relevant to an openings-only reference dataset since chess.com doesn't expose one anyway.

## Style / complexity / rating-suitability tagging — explicit check across all sources

None of the structured sources checked — 365chess's Opening Explorer JSON, Wikipedia's ECO table, the Lichess Opening Explorer schema, the lichess-org/chess-openings TSVs, or chess.com's API — expose a field for playing style (aggressive/positional/gambit/solid), theory-depth/complexity, or rating-band suitability. This matches the ticket's stated expectation. The only place style is characterized at all is in **free-running prose**: 365chess's own `/chess-openings` write-ups (e.g. calling 1.e4 "aggressive," 1.b3 "hypermodern"), and Wikipedia's individual per-opening articles. **Conclusion: style/complexity/rating tags will have to be hand-authored by the project team** for the ~10-20 sample openings, informed by reading such prose — with the licensing caveat that anything drawn from Wikipedia prose should be paraphrased/attributed per CC BY-SA, and 365chess's specific wording should not be copied at all (see recommendation below).

## Recommendation for ticket 0004 (Opening data schema)

**Primary source: the `lichess-org/chess-openings` GitHub dataset** (CC0-1.0), optionally cross-referenced against the Lichess Opening Explorer API for live popularity/win-rate numbers if that endpoint is confirmed reachable from wherever ticket 0004's work actually happens. Rationale: it already gives exactly the structured fields a schema needs — `eco`, `name`, `pgn` (canonical move sequence), plus `uci`/`epd` in the built distribution — under an explicit, unambiguous public-domain license, maintained by the same org that runs Lichess, and it's trivial to pull ~10-20 representative rows across the A-E ECO range for a schema-validation sample.

**Fallback source: Wikipedia's "List of chess openings" (ECO table) + individual per-opening articles.** Rationale: same underlying facts (ECO code, canonical moves, name) in a well-structured table, reachable even if GitHub or Lichess infrastructure is unavailable, and its per-opening prose articles are the best available source for hand-authoring style/complexity descriptions — at the cost of a CC BY-SA attribution/share-alike obligation if any of that text is copied or closely paraphrased rather than used purely as background research.

**Avoid as a data source: 365chess.com.** Not because of any explicit ToS prohibition (there isn't one) or robots.txt block (there mostly isn't one for the top-level pages) — but because the two things 365chess actually contributes beyond the bare ECO facts (its written opening guide prose, and its Opening Explorer's aggregated win/draw/loss/Elo statistics) are its own original compiled content, not open data, and copying them would be republishing 365chess's specific product rather than using the underlying public ECO nomenclature.

## Licensing constraints to carry into ticket 0004

- **ECO codes and canonical move sequences are facts/nomenclature** (originating from Chess Informant's 1974-79 ECO publication) and are not owned by any of the websites that display them (365chess, chess.com, Lichess, Wikipedia). It's fine to record "name + ECO code + move order" facts in the schema regardless of which site you cross-checked them against.
- **lichess-org/chess-openings**: CC0-1.0 — no attribution required, safe to embed verbatim (fields and values) in the project's sample dataset.
- **Lichess Opening Explorer API / database.lichess.org dumps**: stated as CC0/public domain for the downloadable database; treat the live API's JSON as carrying the same posture but note this is an inference, not a directly quoted per-API-response license grant, and re-verify the live endpoint responds normally (it returned 401 in this research session — see caveat above) before depending on it in the actual build.
- **Wikipedia text**: CC BY-SA 4.0 (plus legacy GFDL for pre-2009 content). If any prose (e.g. style/complexity descriptions used to hand-tag the sample) is copied or closely paraphrased from Wikipedia, the schema/dataset documentation must carry attribution (link back to the source article) and any modified text you redistribute must itself be shareable under CC BY-SA.
- **365chess.com content**: do not copy its prose write-ups or its Opening Explorer statistics verbatim into the dataset or schema examples. There's no confirmed legal prohibition (its ToS is silent on this and robots.txt allows crawling the relevant top-level pages), but its curated text and compiled stats are its own product, not open data — treat it as a read-only human reference for inspiration, never as a copy/paste source.
- **chess.com**: not a usable openings-data source at all (no dedicated endpoint), so no licensing question arises there for this project.
- **Style/complexity/rating tags**: not available as structured, licensable data from *any* source checked — this will be original work product by the project team. If that hand-authoring is informed by reading 365chess's or Wikipedia's prose, keep Wikipedia's attribution obligation in mind and avoid lifting 365chess's specific wording.

## Sources unreachable / partially blocked

- `https://www.365chess.com/terms.php` — 404 (this is a stale/legacy path; the live ToS is at `/view/terms-of-service`, which was successfully fetched and read in full).
- `https://explorer.lichess.org/masters?...` (and its `explorer.lichess.ovh` alias) — live query returned `401 Authorization Required` from both `curl` and the WebFetch tool in this session. I did not fabricate a response body; the field-level claims about this API above come from the project's own OpenAPI spec files on GitHub, which fetched successfully, not from this blocked live call. Re-verification of live reachability is recommended before ticket 0004 relies on it.
- `https://www.chess.com/legal/api-terms-of-service` — 404 in this session; not load-bearing for the recommendation since the main Published-Data API announcement page (which did load) was sufficient to confirm there's no openings endpoint.
