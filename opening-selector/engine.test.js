// Run with: node --test

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const E = require("./engine.js");

const sample = JSON.parse(
  fs.readFileSync(path.join(__dirname, "wayfinder", "assets", "opening-sample.json"), "utf8")
).openings;

function baseAnswers(overrides) {
  return Object.assign(
    {
      color: "White",
      rating: 2,
      studyTime: "30to60",
      depth: "Moderate",
      timeControls: ["Rapid"],
      style: E.defaultStyle(),
      longevity: "neutral"
    },
    overrides
  );
}

// ---- question flow ---------------------------------------------------------

test("buildSteps: Beginner/Intermediate asks 2 style axes, defaults the other 2", () => {
  var steps = E.buildSteps({ rating: 1 });
  assert.deepEqual(
    steps.filter((s) => s.indexOf("style:") === 0),
    ["style:riskTolerance", "style:tacticalVsPositional"]
  );
});

test("buildSteps: Advanced+ asks all 4 style axes", () => {
  var steps = E.buildSteps({ rating: 4 });
  assert.deepEqual(
    steps.filter((s) => s.indexOf("style:") === 0),
    ["style:tacticalVsPositional", "style:riskTolerance", "style:dynamicVsStatic", "style:forgivingVsPunishing"]
  );
});

test("buildSteps: firstMoves step comes right after color", () => {
  var steps = E.buildSteps({ rating: 2 });
  assert.equal(steps[0], "color");
  assert.equal(steps[1], "firstMoves");
});

test("isAdvancedPlus: true from Advanced (3) up, false below", () => {
  assert.equal(E.isAdvancedPlus({ rating: 2 }), false);
  assert.equal(E.isAdvancedPlus({ rating: 3 }), true);
  assert.equal(E.isAdvancedPlus({ rating: 5 }), true);
});

// ---- first move --------------------------------------------------------------

test("firstMoveOf: extracts the first move token from a pgn string", () => {
  assert.equal(E.firstMoveOf("1. e4 e5 2. Nf3 Nc6"), "e4");
  assert.equal(E.firstMoveOf("1. Nh3"), "Nh3");
  assert.equal(E.firstMoveOf("1. Nf3 c5 2. c4 g6 3. d4 Bg7 4. e4 Qb6"), "Nf3");
});

test("firstMoveOptionsFor: White gets e4/d4/c4/Nf3 plus an 'other' bucket", () => {
  var values = E.firstMoveOptionsFor("White").map((o) => o.value);
  assert.deepEqual(values, ["e4", "d4", "c4", "Nf3", "other"]);
});

test("firstMoveOptionsFor: Black gets exactly the 4 first moves that occur, no 'other' bucket", () => {
  var values = E.firstMoveOptionsFor("Black").map((o) => o.value);
  assert.deepEqual(values, ["e4", "d4", "Nf3", "c4"]);
});

test("movesOf: tokenizes a pgn into move tokens, ignoring move numbers", () => {
  assert.deepEqual(E.movesOf("1. d4 Nf6 2. c4 c5"), ["d4", "Nf6", "c4", "c5"]);
  assert.deepEqual(E.movesOf("1.Nh3"), ["Nh3"]);
  assert.deepEqual(E.movesOf("1. d4 Nf6 2. c4 c5 3. d5 b5 4. cxb5 a6"), ["d4", "Nf6", "c4", "c5", "d5", "b5", "cxb5", "a6"]);
});

// ---- hard filters -----------------------------------------------------------

test("passesHardFilters: excludes wrong color", () => {
  var najdorf = sample.find((o) => o.eco === "B90");
  assert.equal(E.passesHardFilters(najdorf, baseAnswers({ color: "White" }), "Rapid", "e4"), false);
});

test("passesHardFilters: excludes openings not eligible for the requested time control", () => {
  var najdorf = sample.find((o) => o.eco === "B90"); // Rapid/Classical only, no Blitz
  var answers = baseAnswers({ color: "Black", rating: 4, depth: "Deep" });
  assert.equal(E.passesHardFilters(najdorf, answers, "Bullet/Blitz", "e4"), false);
  assert.equal(E.passesHardFilters(najdorf, answers, "Rapid", "e4"), true);
});

test("depth is not a hard filter below Advanced — Deep opening stays eligible for a Beginner", () => {
  var najdorf = sample.find((o) => o.eco === "B90"); // Deep theory
  var answers = baseAnswers({ color: "Black", rating: 1, depth: "Shallow" });
  assert.equal(E.passesHardFilters(najdorf, answers, "Rapid", "e4"), true);
});

test("depth IS a hard filter at Advanced+ — Deep opening excluded when tolerance is Shallow", () => {
  var najdorf = sample.find((o) => o.eco === "B90");
  var answers = baseAnswers({ color: "Black", rating: 4, depth: "Shallow" });
  assert.equal(E.passesHardFilters(najdorf, answers, "Rapid", "e4"), false);
});

test("depth filter at Advanced+ allows openings at or below the stated tolerance", () => {
  var caroKann = sample.find((o) => o.eco === "B12"); // Moderate theory
  var answers = baseAnswers({ color: "Black", rating: 5, depth: "Moderate" });
  assert.equal(E.passesHardFilters(caroKann, answers, "Rapid", "e4"), true);
});

test("passesHardFilters: firstMove filter matches the opening's own first move", () => {
  var najdorf = sample.find((o) => o.eco === "B90"); // Black, 1.e4
  var answers = baseAnswers({ color: "Black", rating: 4, depth: "Deep" });
  assert.equal(E.passesHardFilters(najdorf, answers, "Rapid", "e4"), true);
  assert.equal(E.passesHardFilters(najdorf, answers, "Rapid", "d4"), false);
});

test("passesHardFilters: firstMove 'other' matches White opening whose first move isn't e4/d4/c4/Nf3", () => {
  var flank = { color: "White", pgn: "1. b4", timeControls: ["Rapid"], depthOfTheory: "Shallow", ratingBand: 1 };
  var mainline = { color: "White", pgn: "1. e4 e5", timeControls: ["Rapid"], depthOfTheory: "Shallow", ratingBand: 1 };
  var answers = baseAnswers({ color: "White", rating: 1 });
  assert.equal(E.passesHardFilters(flank, answers, "Rapid", "other"), true);
  assert.equal(E.passesHardFilters(mainline, answers, "Rapid", "other"), false);
});

// ---- scoring ----------------------------------------------------------------

test("scoreOpening: exact rating-band match scores higher than a distant one", () => {
  var answers = baseAnswers({ color: "White", rating: 1 });
  var italian = sample.find((o) => o.eco === "C50"); // ratingBand 1
  var ruyLopez = sample.find((o) => o.eco === "C60"); // ratingBand 4
  assert.ok(E.scoreOpening(italian, answers) > E.scoreOpening(ruyLopez, answers));
});

test("scoreOpening: style axes asked at the user's rating band outweigh defaulted ones", () => {
  // Beginner flow only asks riskTolerance + tacticalVsPositional; dynamicVsStatic/
  // forgivingVsPunishing are defaulted to 0 and should count for less.
  var answers = baseAnswers({ rating: 1, style: { tacticalVsPositional: 0, riskTolerance: 0, dynamicVsStatic: 0, forgivingVsPunishing: 0 } });
  var matchesAskedAxis = { ratingBand: 1, style: { tacticalVsPositional: 2, riskTolerance: 0, dynamicVsStatic: 0, forgivingVsPunishing: 0 }, healthAtHigherLevels: 0 };
  var matchesDefaultedAxis = { ratingBand: 1, style: { tacticalVsPositional: 0, riskTolerance: 0, dynamicVsStatic: 2, forgivingVsPunishing: 0 }, healthAtHigherLevels: 0 };
  assert.ok(E.scoreOpening(matchesDefaultedAxis, answers) > E.scoreOpening(matchesAskedAxis, answers));
});

test("scoreOpening: 'stays sound as I improve' rewards high healthAtHigherLevels", () => {
  var soundAnswers = baseAnswers({ longevity: "sound" });
  var indifferentAnswers = baseAnswers({ longevity: "now" });
  var opening = { ratingBand: 2, style: E.defaultStyle(), healthAtHigherLevels: 2 };
  assert.ok(E.scoreOpening(opening, soundAnswers) > E.scoreOpening(opening, indifferentAnswers));
});

// ---- study-time estimate -----------------------------------------------------

test("formatEstimate: short competency times render in days, naming the actual pace", () => {
  assert.equal(E.formatEstimate(3, "2plus"), "≈3 hours total — about 2 days at 2+ hours a day.");
});

test("formatEstimate: long competency times render in weeks, naming the actual pace", () => {
  assert.equal(E.formatEstimate(80, "30to60"), "≈80 hours total — about 15 weeks at 30-60 minutes a day.");
});

test("formatEstimate: falls back to a neutral total when no study time is stored", () => {
  assert.equal(E.formatEstimate(24), "≈24 hours total to competency.");
});

// ---- search -------------------------------------------------------------------

test("searchOpenings: empty query returns no results", () => {
  assert.deepEqual(E.searchOpenings("", sample), []);
  assert.deepEqual(E.searchOpenings("   ", sample), []);
});

test("searchOpenings: matches by substring anywhere in the name, case-insensitively", () => {
  var results = E.searchOpenings("queen", sample);
  assert.deepEqual(results.map((o) => o.name), ["Queen's Gambit"]);
});

test("searchOpenings: matches earlier in the name sort before matches later in the name", () => {
  var results = E.searchOpenings("defense", sample);
  assert.ok(results.length > 1);
  for (var i = 1; i < results.length; i++) {
    var prevIndex = results[i - 1].name.toLowerCase().indexOf("defense");
    var curIndex = results[i].name.toLowerCase().indexOf("defense");
    assert.ok(prevIndex <= curIndex);
  }
});

test("searchOpenings: caps results at the given limit", () => {
  var results = E.searchOpenings("e", sample, 2);
  assert.equal(results.length, 2);
});

test("searchOpeningFamilies: collapses same-named rows into one family, others attached as deeper", () => {
  // Real-world shape (wayfinder/assets/opening-catalog.json): many rows share
  // the exact same name — e.g. 8 different "Sicilian Defense: Closed" rows at
  // increasing PGN depth, differing only by ECO code — which used to make the
  // search dropdown look like the same result repeated with nothing to tell
  // them apart.
  var shallow = { name: "Sicilian Defense: Closed", eco: "B23", color: "Black", pgn: "1. e4 c5 2. Nc3" };
  var medium = { name: "Sicilian Defense: Closed", eco: "B24", color: "Black", pgn: "1. e4 c5 2. Nc3 Nc6 3. g3" };
  var deep = { name: "Sicilian Defense: Closed", eco: "B25", color: "Black", pgn: "1. e4 c5 2. Nc3 Nc6 3. g3 g6 4. Bg2" };
  var unrelated = { name: "French Defense", eco: "C00", color: "Black", pgn: "1. e4 e6" };

  var families = E.searchOpeningFamilies("sicilian", [medium, unrelated, deep, shallow]);

  assert.equal(families.length, 1);
  assert.equal(families[0].opening, shallow);
  assert.deepEqual(families[0].deeper.map((d) => d.opening), [medium, deep]);
});

test("searchOpeningFamilies: distinct families stay separate and keep search-relevance order", () => {
  var najdorf = { name: "Sicilian Defense: Najdorf Variation", eco: "B90", color: "Black", pgn: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6" };
  var sicilian = { name: "Sicilian Defense", eco: "B20", color: "Black", pgn: "1. e4 c5" };

  var families = E.searchOpeningFamilies("sicilian", [najdorf, sicilian]);

  assert.deepEqual(families.map((f) => f.opening), [sicilian, najdorf]);
  assert.deepEqual(families[0].deeper, []);
  assert.deepEqual(families[1].deeper, []);
});

test("searchOpeningFamilies: limit caps the number of families, not raw rows", () => {
  var shallow = { name: "Sicilian Defense: Closed", eco: "B23", color: "Black", pgn: "1. e4 c5 2. Nc3" };
  var deeper1 = { name: "Sicilian Defense: Closed", eco: "B24", color: "Black", pgn: "1. e4 c5 2. Nc3 Nc6 3. g3" };
  var deeper2 = { name: "Sicilian Defense: Closed", eco: "B25", color: "Black", pgn: "1. e4 c5 2. Nc3 Nc6 3. g3 g6" };
  // Matches "sicilian" later in the name (not at index 0 like the others
  // above), so it reliably sorts after them regardless of name-length
  // tie-breaking — isolating the thing this test actually checks (the
  // families list, not raw rows, gets capped).
  var other = { name: "English Opening: Sicilian Reversed", eco: "A15", color: "White", pgn: "1. Nf3" };

  var families = E.searchOpeningFamilies("sicilian", [shallow, deeper1, deeper2, other], 1);
  assert.equal(families.length, 1);
  assert.equal(families[0].opening, shallow);
  assert.deepEqual(families[0].deeper.map((d) => d.opening), [deeper1, deeper2]);
});

// ---- persisted answers ----------------------------------------------------------

function fakeStorage(initial) {
  var store = Object.assign({}, initial);
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem: function (key, value) {
      store[key] = String(value);
    }
  };
}

test("loadPersistedAnswers: empty storage yields an empty object", () => {
  assert.deepEqual(E.loadPersistedAnswers(fakeStorage()), {});
});

test("loadPersistedAnswers: tolerates corrupt JSON instead of throwing", () => {
  var storage = fakeStorage();
  storage.setItem(E.STORAGE_KEY, "{not json");
  assert.deepEqual(E.loadPersistedAnswers(storage), {});
});

test("savePersistedAnswers + loadPersistedAnswers: round-trips exactly the persistable fields", () => {
  var storage = fakeStorage();
  var answers = baseAnswers({ color: "Black", firstMoves: ["e4"] });
  E.savePersistedAnswers(storage, answers);
  assert.deepEqual(E.loadPersistedAnswers(storage), answers);
});

test("savePersistedAnswers: drops keys outside the known answer fields", () => {
  var storage = fakeStorage();
  E.savePersistedAnswers(storage, { color: "White", bogus: "nope" });
  assert.deepEqual(E.loadPersistedAnswers(storage), { color: "White" });
});

// ---- shortlist ----------------------------------------------------------------

test("shortlistFor: returns at most 3 entries, sorted best-first", () => {
  var answers = baseAnswers({ color: "Black", rating: 2, depth: "Moderate", timeControls: ["Rapid"] });
  var ranked = E.shortlistFor("Rapid", "e4", answers, sample);
  assert.ok(ranked.length <= 3);
  for (var i = 1; i < ranked.length; i++) {
    assert.ok(ranked[i - 1].score >= ranked[i].score);
  }
});

test("shortlistFor: empty when no candidate survives the hard filters", () => {
  // Synthetic fixture, not the real sample — the 14-row sample always keeps at
  // least one Shallow/all-time-control opening per color, so it can never
  // naturally empty out; this isolates the "nothing survives" behavior itself.
  var openings = [
    { color: "White", timeControls: ["Rapid"], depthOfTheory: "Deep", ratingBand: 1, style: E.defaultStyle(), healthAtHigherLevels: 0 }
  ];
  var answers = baseAnswers({ color: "White", rating: 5, depth: "Shallow", timeControls: ["Bullet/Blitz"] });
  var ranked = E.shortlistFor("Bullet/Blitz", "e4", answers, openings);
  assert.equal(ranked.length, 0);
});

test("shortlistFor: dedupes same-name openings, keeping only the higher scorer", () => {
  var answers = baseAnswers({ color: "White", rating: 2 });
  var weaker = {
    name: "Nimzo-Larsen Attack: Modern Variation", color: "White", pgn: "1. b3 e5",
    timeControls: ["Rapid"], depthOfTheory: "Shallow", ratingBand: 5,
    style: E.defaultStyle(), healthAtHigherLevels: -2
  };
  var stronger = {
    name: "Nimzo-Larsen Attack: Modern Variation", color: "White", pgn: "1. b3 d5",
    timeControls: ["Rapid"], depthOfTheory: "Shallow", ratingBand: 2,
    style: E.defaultStyle(), healthAtHigherLevels: 2
  };
  var ranked = E.shortlistFor("Rapid", "other", answers, [weaker, stronger]);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].opening, stronger);
});

test("shortlistFor: collapses a pgn-prefix chain into one family, with deeper lines attached to the root", () => {
  var answers = baseAnswers({ color: "Black", rating: 3 });
  var root = {
    name: "Benko Gambit", color: "Black", pgn: "1. d4 Nf6 2. c4 c5 3. d5 b5",
    timeControls: ["Rapid"], depthOfTheory: "Moderate", ratingBand: 3,
    style: E.defaultStyle(), healthAtHigherLevels: 1
  };
  var accepted = {
    name: "Benko Gambit Accepted", color: "Black", pgn: "1. d4 Nf6 2. c4 c5 3. d5 b5 4. cxb5 a6",
    timeControls: ["Rapid"], depthOfTheory: "Moderate", ratingBand: 3,
    style: E.defaultStyle(), healthAtHigherLevels: 1
  };
  var dlugy = {
    name: "Benko Gambit Accepted: Dlugy Variation", color: "Black", pgn: "1. d4 Nf6 2. c4 c5 3. d5 b5 4. cxb5 a6 5. f3",
    timeControls: ["Rapid"], depthOfTheory: "Moderate", ratingBand: 3,
    style: E.defaultStyle(), healthAtHigherLevels: 1
  };
  var unrelated = {
    name: "Queen's Gambit Declined", color: "Black", pgn: "1. d4 d5 2. c4 e6",
    timeControls: ["Rapid"], depthOfTheory: "Shallow", ratingBand: 1,
    style: E.defaultStyle(), healthAtHigherLevels: 1
  };

  var ranked = E.shortlistFor("Rapid", "d4", answers, [root, accepted, dlugy, unrelated]);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].opening, root);
  // accepted and dlugy tie in score (same ratingBand/health) — the shallower one wins.
  assert.deepEqual(ranked[0].deeper.map((d) => d.opening), [accepted]);
  assert.equal(ranked[1].opening, unrelated);
  assert.deepEqual(ranked[1].deeper, []);
});

test("shortlistFor: within a family, the highest-scoring deeper member wins, even if it's the deepest", () => {
  var answers = baseAnswers({ color: "Black", rating: 3, longevity: "sound" });
  var root = {
    name: "Benko Gambit", color: "Black", pgn: "1. d4 Nf6 2. c4 c5 3. d5 b5",
    timeControls: ["Rapid"], depthOfTheory: "Moderate", ratingBand: 3,
    style: E.defaultStyle(), healthAtHigherLevels: 0
  };
  var accepted = {
    name: "Benko Gambit Accepted", color: "Black", pgn: "1. d4 Nf6 2. c4 c5 3. d5 b5 4. cxb5 a6",
    timeControls: ["Rapid"], depthOfTheory: "Moderate", ratingBand: 3,
    style: E.defaultStyle(), healthAtHigherLevels: 0
  };
  var dlugy = {
    // Deepest in the chain, but scores strictly higher here because
    // longevity is "sound" and this line has the best healthAtHigherLevels.
    name: "Benko Gambit Accepted: Dlugy Variation", color: "Black", pgn: "1. d4 Nf6 2. c4 c5 3. d5 b5 4. cxb5 a6 5. f3",
    timeControls: ["Rapid"], depthOfTheory: "Moderate", ratingBand: 3,
    style: E.defaultStyle(), healthAtHigherLevels: 2
  };

  var ranked = E.shortlistFor("Rapid", "d4", answers, [root, accepted, dlugy]);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].opening, root);
  assert.deepEqual(ranked[0].deeper.map((d) => d.opening), [dlugy]);
});

test("shortlistFor: a shared move-prefix alone isn't enough to group — the name must also be a prefix", () => {
  var answers = baseAnswers({ color: "Black", rating: 2 });
  var indianDefense = {
    name: "Indian Defense", color: "Black", pgn: "1. d4 Nf6",
    timeControls: ["Rapid"], depthOfTheory: "Shallow", ratingBand: 2,
    style: E.defaultStyle(), healthAtHigherLevels: 1
  };
  var nimzoIndian = {
    // Shares the "d4 Nf6" move-prefix with Indian Defense, but is an unrelated
    // named system, not a deeper line of "Indian Defense" itself.
    name: "Nimzo-Indian Defense", color: "Black", pgn: "1. d4 Nf6 2. c4 e6 3. Nc3 Bb4",
    timeControls: ["Rapid"], depthOfTheory: "Moderate", ratingBand: 2,
    style: E.defaultStyle(), healthAtHigherLevels: 1
  };
  var indianSubline = {
    name: "Indian Defense: Anti-Grünfeld, Alekhine Variation", color: "Black",
    pgn: "1. d4 Nf6 2. Nf3 g6 3. Nc3 d5",
    timeControls: ["Rapid"], depthOfTheory: "Moderate", ratingBand: 2,
    style: E.defaultStyle(), healthAtHigherLevels: 1
  };

  var ranked = E.shortlistFor("Rapid", "d4", answers, [indianDefense, nimzoIndian, indianSubline]);

  var indianFamily = ranked.find((r) => r.opening === indianDefense);
  assert.ok(indianFamily, "Indian Defense should be its own family root");
  assert.deepEqual(indianFamily.deeper.map((d) => d.opening), [indianSubline]);

  var nimzoFamily = ranked.find((r) => r.opening === nimzoIndian);
  assert.ok(nimzoFamily, "Nimzo-Indian Defense should be its own separate family, not nested under Indian Defense");
  assert.deepEqual(nimzoFamily.deeper, []);
});

test("shortlistFor: a shared family-root name groups entries even when the moves diverge (upstream naming quirk)", () => {
  // Real case from wayfinder/assets/opening-catalog.json: the upstream
  // lichess-org/chess-openings dataset files "Scotch Game: Benima Defense"
  // under the Scotch Game name even though its actual moves (3.Bc4) don't
  // extend the Scotch Game's own 3.d4 — a genuine naming quirk, not a data
  // error. Without family-root grouping, this used to show as its own
  // separate top-3 shortlist slot (with the Scotch family's inherited
  // overview text, which then described a move — 3.d4 — the row doesn't
  // actually play), crowding out a genuinely different opening.
  var answers = baseAnswers({ color: "White", rating: 2 });
  var scotchGame = {
    name: "Scotch Game", color: "White", pgn: "1. e4 e5 2. Nf3 Nc6 3. d4",
    timeControls: ["Rapid"], depthOfTheory: "Moderate", ratingBand: 2,
    style: E.defaultStyle(), healthAtHigherLevels: 1
  };
  var benimaDefense = {
    name: "Scotch Game: Benima Defense", color: "White",
    pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Be7 4. d4 exd4",
    timeControls: ["Rapid"], depthOfTheory: "Moderate", ratingBand: 2,
    style: E.defaultStyle(), healthAtHigherLevels: 1
  };
  var italianGame = {
    name: "Italian Game", color: "White", pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4",
    timeControls: ["Rapid"], depthOfTheory: "Shallow", ratingBand: 1,
    style: E.defaultStyle(), healthAtHigherLevels: 1
  };

  var ranked = E.shortlistFor("Rapid", "e4", answers, [scotchGame, benimaDefense, italianGame]);

  assert.equal(ranked.length, 2, "Benima Defense should collapse into the Scotch Game family, not stand alone");
  var scotchFamily = ranked.find((r) => r.opening === scotchGame);
  assert.ok(scotchFamily, "Scotch Game should be the family root");
  assert.deepEqual(scotchFamily.deeper.map((d) => d.opening), [benimaDefense]);

  var italianFamily = ranked.find((r) => r.opening === italianGame);
  assert.ok(italianFamily, "Italian Game should remain its own separate family");
});
