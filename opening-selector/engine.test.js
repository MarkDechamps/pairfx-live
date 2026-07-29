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

test("isAdvancedPlus: true from Advanced (3) up, false below", () => {
  assert.equal(E.isAdvancedPlus({ rating: 2 }), false);
  assert.equal(E.isAdvancedPlus({ rating: 3 }), true);
  assert.equal(E.isAdvancedPlus({ rating: 5 }), true);
});

// ---- hard filters -----------------------------------------------------------

test("passesHardFilters: excludes wrong color", () => {
  var najdorf = sample.find((o) => o.eco === "B90");
  assert.equal(E.passesHardFilters(najdorf, baseAnswers({ color: "White" }), "Rapid"), false);
});

test("passesHardFilters: excludes openings not eligible for the requested time control", () => {
  var najdorf = sample.find((o) => o.eco === "B90"); // Rapid/Classical only, no Blitz
  var answers = baseAnswers({ color: "Black", rating: 4, depth: "Deep" });
  assert.equal(E.passesHardFilters(najdorf, answers, "Bullet/Blitz"), false);
  assert.equal(E.passesHardFilters(najdorf, answers, "Rapid"), true);
});

test("depth is not a hard filter below Advanced — Deep opening stays eligible for a Beginner", () => {
  var najdorf = sample.find((o) => o.eco === "B90"); // Deep theory
  var answers = baseAnswers({ color: "Black", rating: 1, depth: "Shallow" });
  assert.equal(E.passesHardFilters(najdorf, answers, "Rapid"), true);
});

test("depth IS a hard filter at Advanced+ — Deep opening excluded when tolerance is Shallow", () => {
  var najdorf = sample.find((o) => o.eco === "B90");
  var answers = baseAnswers({ color: "Black", rating: 4, depth: "Shallow" });
  assert.equal(E.passesHardFilters(najdorf, answers, "Rapid"), false);
});

test("depth filter at Advanced+ allows openings at or below the stated tolerance", () => {
  var caroKann = sample.find((o) => o.eco === "B12"); // Moderate theory
  var answers = baseAnswers({ color: "Black", rating: 5, depth: "Moderate" });
  assert.equal(E.passesHardFilters(caroKann, answers, "Rapid"), true);
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

test("formatEstimate: short competency times render in days", () => {
  assert.equal(E.formatEstimate(3, "2plus"), "about 2 days at your pace");
});

test("formatEstimate: long competency times render in weeks", () => {
  assert.equal(E.formatEstimate(80, "30to60"), "about 15 weeks at your pace");
});

// ---- shortlist ----------------------------------------------------------------

test("shortlistFor: returns at most 3 entries, sorted best-first", () => {
  var answers = baseAnswers({ color: "Black", rating: 2, depth: "Moderate", timeControls: ["Rapid"] });
  var ranked = E.shortlistFor("Rapid", answers, sample);
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
  var ranked = E.shortlistFor("Bullet/Blitz", answers, openings);
  assert.equal(ranked.length, 0);
});
