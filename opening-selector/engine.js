// Wayfinder — Chess Opening Advisor
// Pure question-flow + scoring/filtering engine, per wayfinder/map.md and tickets 0001-0004.
// No DOM in here — kept separate from app.js so it can be unit-tested with `node --test`.

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Engine = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var RATING_OPTIONS = [
    { value: 1, label: "Beginner", sub: "Just learning the rules / new to openings" },
    { value: 2, label: "Intermediate", sub: "Comfortable with the rules, played a fair number of games, no formal rating" },
    { value: 3, label: "Advanced", sub: "Regular/club player, solid tactics, but limited deep opening theory" },
    { value: 4, label: "Expert", sub: "FIDE rating 2000+" },
    { value: 5, label: "Master", sub: "FIDE Master (FM) title or higher, or FIDE rating 2300+" }
  ];

  var STUDY_TIME_OPTIONS = [
    { value: "under30", label: "Under 30 min/day", hoursPerDay: 0.4, paceLabel: "under 30 minutes a day" },
    { value: "30to60", label: "30-60 min/day", hoursPerDay: 0.75, paceLabel: "30-60 minutes a day" },
    { value: "1to2", label: "1-2 hours/day", hoursPerDay: 1.5, paceLabel: "1-2 hours a day" },
    { value: "2plus", label: "2+ hours/day", hoursPerDay: 2.5, paceLabel: "2+ hours a day" }
  ];

  // Only these fields are ever saved to/loaded from local storage — a
  // whitelist, not just "whatever's in state.answers", so a future stray key
  // in app.js's state can never leak into (or crash) persisted data.
  var PERSISTED_ANSWER_KEYS = [
    "color", "firstMoves", "rating", "studyTime", "depth", "timeControls", "style", "longevity"
  ];
  var STORAGE_KEY = "wayfinder:wizardAnswers";

  var DEPTH_OPTIONS = [
    { value: "Shallow", label: "Shallow", sub: "General understanding, few forced moves" },
    { value: "Moderate", label: "Moderate", sub: "Main lines plus typical plans" },
    { value: "Deep", label: "Deep", sub: "Long, precise theoretical lines" }
  ];
  var DEPTH_RANK = { Shallow: 1, Moderate: 2, Deep: 3 };

  var TIME_CONTROL_OPTIONS = ["Bullet/Blitz", "Rapid", "Classical/Correspondence"];

  var LONGEVITY_OPTIONS = [
    { value: "sound", label: "Stays sound as I improve", sub: "Even if it's less punchy right now" },
    { value: "neutral", label: "No strong preference" },
    { value: "now", label: "Best fit for right now", sub: "I'll switch later if I outgrow it" }
  ];

  var STYLE_AXES = {
    tacticalVsPositional: {
      question: "Do you enjoy memorizing precise lines, or prefer general understanding?",
      negLabel: "General understanding",
      posLabel: "Memorizing precise lines",
      negDesc: "calm, positional play",
      posDesc: "sharp, tactical play"
    },
    riskTolerance: {
      question: "Sharp, attacking chess — or calm and solid?",
      negLabel: "Calm and solid",
      posLabel: "Sharp and attacking",
      negDesc: "solid, safe structures",
      posDesc: "sharp, gambit-friendly play"
    },
    dynamicVsStatic: {
      question: "Do you prefer imbalanced, initiative-chasing positions, or stable long-term structures?",
      negLabel: "Stable, long-term",
      posLabel: "Imbalanced, initiative-chasing",
      negDesc: "stable, static structures",
      posDesc: "dynamic, imbalanced structures"
    },
    forgivingVsPunishing: {
      question: "How much margin for error do you want after a mistake?",
      negLabel: "Forgiving of mistakes",
      posLabel: "Punishing of mistakes",
      negDesc: "forgiving lines that stay recoverable",
      posDesc: "razor-sharp lines that punish inaccuracy"
    }
  };

  function firstMoveOf(pgn) {
    var match = /^1\.\s*(\S+)/.exec(pgn);
    return match ? match[1] : null;
  }

  function movesOf(pgn) {
    return pgn.replace(/\d+\.\s*/g, "").trim().split(/\s+/).filter(Boolean);
  }

  var WHITE_NAMED_FIRST_MOVES = ["e4", "d4", "c4", "Nf3"];
  var BLACK_FIRST_MOVE_OPTIONS = ["e4", "d4", "Nf3", "c4"];

  function firstMoveOptionsFor(color) {
    if (color === "Black") {
      return BLACK_FIRST_MOVE_OPTIONS.map(function (move) {
        return { value: move, label: "1. " + move };
      });
    }
    var options = WHITE_NAMED_FIRST_MOVES.map(function (move) {
      return { value: move, label: "1. " + move };
    });
    options.push({ value: "other", label: "Other / flank openings" });
    return options;
  }

  function isAdvancedPlus(answers) {
    return answers.rating != null && answers.rating >= 3;
  }

  function styleAxesForFlow(answers) {
    if (answers.rating != null && answers.rating <= 2) {
      return ["riskTolerance", "tacticalVsPositional"];
    }
    return ["tacticalVsPositional", "riskTolerance", "dynamicVsStatic", "forgivingVsPunishing"];
  }

  function buildSteps(answers) {
    var steps = ["color", "firstMoves", "rating", "studyTime", "depth", "timeControls"];
    styleAxesForFlow(answers).forEach(function (axis) {
      steps.push("style:" + axis);
    });
    steps.push("longevity");
    return steps;
  }

  function defaultStyle() {
    return { tacticalVsPositional: 0, riskTolerance: 0, dynamicVsStatic: 0, forgivingVsPunishing: 0 };
  }

  function matchesFirstMove(opening, firstMove) {
    var actual = firstMoveOf(opening.pgn);
    if (firstMove === "other") return WHITE_NAMED_FIRST_MOVES.indexOf(actual) === -1;
    return actual === firstMove;
  }

  function passesHardFilters(opening, answers, timeControl, firstMove) {
    if (opening.color !== answers.color) return false;
    if (opening.timeControls.indexOf(timeControl) === -1) return false;
    if (!matchesFirstMove(opening, firstMove)) return false;
    if (isAdvancedPlus(answers)) {
      if (DEPTH_RANK[opening.depthOfTheory] > DEPTH_RANK[answers.depth]) return false;
    }
    return true;
  }

  // Axes explicitly asked score at full weight; axes defaulted to the neutral
  // midpoint (skipped at Beginner/Intermediate) score at reduced weight, since
  // "0" there is an assumption, not a stated preference.
  var ASKED_AXIS_WEIGHT = 1;
  var DEFAULTED_AXIS_WEIGHT = 0.4;

  function longevityWeight(longevity) {
    if (longevity === "sound") return 1.5;
    if (longevity === "now") return 0;
    return 0.5; // "no strong preference" — mild default lean toward durability as a tiebreak
  }

  function scoreOpening(opening, answers) {
    var askedAxes = styleAxesForFlow(answers);
    var score = 0;

    score -= Math.abs(opening.ratingBand - answers.rating);

    Object.keys(STYLE_AXES).forEach(function (axisId) {
      var weight = askedAxes.indexOf(axisId) !== -1 ? ASKED_AXIS_WEIGHT : DEFAULTED_AXIS_WEIGHT;
      score -= weight * Math.abs(opening.style[axisId] - answers.style[axisId]);
    });

    score += longevityWeight(answers.longevity) * opening.healthAtHigherLevels;

    return score;
  }

  function hoursPerDayFor(studyTimeValue) {
    var match = STUDY_TIME_OPTIONS.filter(function (o) { return o.value === studyTimeValue; })[0];
    return match ? match.hoursPerDay : 1;
  }

  function paceLabelFor(studyTimeValue) {
    var match = STUDY_TIME_OPTIONS.filter(function (o) { return o.value === studyTimeValue; })[0];
    return match ? match.paceLabel : null;
  }

  // studyTimeValue is optional — the search screen (wayfinder/tickets/0013)
  // calls this without one when the user has never touched the wizard and so
  // has no stored study time, getting a neutral total instead of a fabricated
  // pace.
  function formatEstimate(hoursToCompetency, studyTimeValue) {
    var totalHours = Math.round(hoursToCompetency);
    var totalPhrase = "≈" + totalHours + " hour" + (totalHours === 1 ? "" : "s") + " total";
    var pace = paceLabelFor(studyTimeValue);
    if (!pace) return totalPhrase + " to competency.";

    var hoursPerDay = hoursPerDayFor(studyTimeValue);
    var days = Math.max(1, Math.ceil(hoursToCompetency / hoursPerDay));
    var timePhrase;
    if (days < 14) {
      timePhrase = "about " + days + " day" + (days === 1 ? "" : "s");
    } else {
      timePhrase = "about " + Math.round(days / 7) + " weeks";
    }
    return totalPhrase + " — " + timePhrase + " at " + pace + ".";
  }

  function ratingLabelFor(band) {
    var match = RATING_OPTIONS.filter(function (o) { return o.value === band; })[0];
    return match ? match.label : String(band);
  }

  function buildRationale(opening, answers) {
    var askedAxes = styleAxesForFlow(answers);
    var timeEstimate = formatEstimate(opening.estimatedHoursToCompetency, answers.studyTime);
    var lead;

    if (answers.longevity === "sound" && opening.healthAtHigherLevels >= 1) {
      lead = "A mainstay that stays sound as you improve";
    } else {
      var best = null;
      askedAxes.forEach(function (axisId) {
        var val = opening.style[axisId];
        if (Math.abs(val) < 1) return;
        var diff = Math.abs(val - answers.style[axisId]);
        if (!best || diff < best.diff) best = { axisId: axisId, val: val, diff: diff };
      });
      if (best) {
        var axis = STYLE_AXES[best.axisId];
        lead = "Leans " + (best.val >= 1 ? axis.posDesc : axis.negDesc) + ", matching your style";
      } else {
        lead = "A solid fit for your rating level";
      }
    }

    return lead + " — " + timeEstimate + ".";
  }

  function dedupeByName(entries) {
    var bestByName = {};
    entries.forEach(function (entry) {
      var name = entry.opening.name;
      if (!bestByName[name] || entry.score > bestByName[name].score) {
        bestByName[name] = entry;
      }
    });
    return Object.keys(bestByName).map(function (name) { return bestByName[name]; });
  }

  function isMovePrefix(shorterMoves, longerMoves) {
    if (shorterMoves.length > longerMoves.length) return false;
    return shorterMoves.every(function (move, i) { return move === longerMoves[i]; });
  }

  // The name up to (not including) the first ": " — same "family" concept
  // scripts/build_opening_catalog.py uses to inherit tags/overview/
  // reputationNotes across a family's rows. Two entries sharing this root
  // are the same family regardless of their actual move order: a handful of
  // named sub-variations in the upstream lichess-org dataset are filed under
  // a family name their own moves don't literally extend (e.g. "Scotch
  // Game: Benima Defense" heads into 3.Bc4, not the Scotch's own 3.d4) — an
  // upstream naming quirk, not a data error — so relying on move-prefix
  // alone would wrongly split them into separate top-level shortlist slots.
  function familyRootOf(name) {
    return name.split(":")[0].trim();
  }

  // Groups entries into one "family" — same underlying idea, played to
  // increasing depth — if either (a) they share a family root name (see
  // familyRootOf), or (b) one's pgn is a strict move-prefix of the other's
  // AND the name is also a prefix (e.g. "Benko Gambit" -> "Benko Gambit
  // Accepted" -> "...: Dlugy Variation", none of which share a family root
  // by (a) since none of their names contain ":" before the divergence).
  // A shared move-prefix or name-prefix *alone* is never enough — see
  // engine.test.js for the Indian Defense / Nimzo-Indian Defense case.
  // Processing shortest-first means each entry's root, once assigned, is
  // guaranteed a prefix of everything deeper that could ever attach to it —
  // no entry can match two different roots, so groups never need merging
  // after the fact.
  // Clusters any array of { opening, ... } entries into families, shallowest
  // member as root — the shared core both shortlistFor (below, picks the
  // single best-scoring deeper member) and searchOpeningFamilies (further
  // down, keeps every deeper member — search has no score to rank them by)
  // build on.
  function clusterByFamily(entries) {
    var byLength = entries.slice().sort(function (a, b) {
      return movesOf(a.opening.pgn).length - movesOf(b.opening.pgn).length;
    });
    var groups = [];
    byLength.forEach(function (entry) {
      var entryMoves = movesOf(entry.opening.pgn);
      var entryRoot = familyRootOf(entry.opening.name);
      var group = groups.filter(function (g) {
        if (familyRootOf(g.root.opening.name) === entryRoot) return true;
        return isMovePrefix(movesOf(g.root.opening.pgn), entryMoves) &&
          entry.opening.name.indexOf(g.root.opening.name) === 0;
      })[0];
      if (group) {
        group.deeper.push(entry);
      } else {
        groups.push({ root: entry, deeper: [] });
      }
    });
    return groups;
  }

  function groupIntoFamilies(entries) {
    return clusterByFamily(entries).map(function (group) {
      var best = group.deeper.reduce(function (running, entry) {
        return !running || entry.score > running.score ? entry : running;
      }, null);
      return { root: group.root, deeper: best ? [best] : [] };
    });
  }

  // Name-only substring search over the full catalog (wayfinder/tickets/0013)
  // — filter-free, no color/rating/style gating. Matches earlier in the name
  // rank first (typing "najdorf" should surface the Najdorf line above a
  // family whose name merely contains "najdorf" further in), tied names
  // broken by shorter-then-alphabetical so a family root outranks its own
  // longer sub-variation names.
  var DEFAULT_SEARCH_LIMIT = 20;

  function searchOpenings(query, openings, limit) {
    var q = (query || "").trim().toLowerCase();
    if (!q) return [];
    return openings
      .map(function (o) { return { opening: o, index: o.name.toLowerCase().indexOf(q) }; })
      .filter(function (entry) { return entry.index !== -1; })
      .sort(function (a, b) {
        if (a.index !== b.index) return a.index - b.index;
        if (a.opening.name.length !== b.opening.name.length) return a.opening.name.length - b.opening.name.length;
        return a.opening.name < b.opening.name ? -1 : a.opening.name > b.opening.name ? 1 : 0;
      })
      .slice(0, limit || DEFAULT_SEARCH_LIMIT)
      .map(function (entry) { return entry.opening; });
  }

  // Same search, but collapses matches sharing the exact same name into one
  // family (root = shallowest PGN, deeper = the rest, sorted shallow-to-deep)
  // before capping at `limit` — otherwise typing e.g. "Sicilian" surfaces the
  // same family name many times over with nothing but an ECO code to tell
  // them apart (the catalog genuinely has several distinct PGNs sharing one
  // exact name — see engine.test.js). Deliberately *exact*-name grouping,
  // not shortlistFor's family-root-prefix grouping (clusterByFamily/
  // familyRootOf) — that would also merge e.g. "Sicilian Defense" with
  // "Sicilian Defense: Najdorf Variation", which is right for a 3-slot
  // shortlist but wrong here: those are meaningfully different results a
  // searcher can already tell apart by name, and merging them would bury the
  // exact one they typed for under an unrelated sibling's info.
  function searchOpeningFamilies(query, openings, limit) {
    var matches = searchOpenings(query, openings, Infinity);
    var order = [];
    var byName = {};
    matches.forEach(function (opening, rank) {
      var family = byName[opening.name];
      if (!family) {
        byName[opening.name] = { opening: opening, deeper: [], rank: rank };
        order.push(opening.name);
        return;
      }
      if (movesOf(opening.pgn).length < movesOf(family.opening.pgn).length) {
        family.deeper.push({ opening: family.opening });
        family.opening = opening;
      } else {
        family.deeper.push({ opening: opening });
      }
      family.rank = Math.min(family.rank, rank);
    });
    return order
      .map(function (name) { return byName[name]; })
      .sort(function (a, b) { return a.rank - b.rank; })
      .slice(0, limit || DEFAULT_SEARCH_LIMIT)
      .map(function (family) {
        var deeper = family.deeper.slice().sort(function (a, b) {
          return movesOf(a.opening.pgn).length - movesOf(b.opening.pgn).length;
        });
        return { opening: family.opening, deeper: deeper };
      });
  }

  // Reads/writes the wizard's answers via an injected storage object (real
  // usage passes window.localStorage; tests inject an in-memory fake) so
  // this stays a pure function of its arguments like the rest of engine.js —
  // wayfinder/tickets/0012.
  function loadPersistedAnswers(storage) {
    if (!storage) return {};
    var raw;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch (e) {
      return {};
    }
    if (!raw) return {};
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return {};
    }
    if (!parsed || typeof parsed !== "object") return {};
    var result = {};
    PERSISTED_ANSWER_KEYS.forEach(function (key) {
      if (parsed[key] !== undefined) result[key] = parsed[key];
    });
    return result;
  }

  function savePersistedAnswers(storage, answers) {
    if (!storage) return;
    var toStore = {};
    PERSISTED_ANSWER_KEYS.forEach(function (key) {
      if (answers[key] !== undefined) toStore[key] = answers[key];
    });
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (e) {
      // Storage unavailable/full/disabled — persistence is a convenience,
      // never a requirement for the app to function.
    }
  }

  function shortlistFor(timeControl, firstMove, answers, openings) {
    var candidates = openings
      .filter(function (o) { return passesHardFilters(o, answers, timeControl, firstMove); })
      .map(function (o) { return { opening: o, score: scoreOpening(o, answers) }; });
    var families = groupIntoFamilies(dedupeByName(candidates));
    return families
      .map(function (family) {
        return { opening: family.root.opening, score: family.root.score, deeper: family.deeper };
      })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 3);
  }

  return {
    RATING_OPTIONS: RATING_OPTIONS,
    STUDY_TIME_OPTIONS: STUDY_TIME_OPTIONS,
    DEPTH_OPTIONS: DEPTH_OPTIONS,
    DEPTH_RANK: DEPTH_RANK,
    TIME_CONTROL_OPTIONS: TIME_CONTROL_OPTIONS,
    LONGEVITY_OPTIONS: LONGEVITY_OPTIONS,
    STYLE_AXES: STYLE_AXES,
    firstMoveOf: firstMoveOf,
    movesOf: movesOf,
    firstMoveOptionsFor: firstMoveOptionsFor,
    isAdvancedPlus: isAdvancedPlus,
    styleAxesForFlow: styleAxesForFlow,
    buildSteps: buildSteps,
    defaultStyle: defaultStyle,
    passesHardFilters: passesHardFilters,
    scoreOpening: scoreOpening,
    hoursPerDayFor: hoursPerDayFor,
    formatEstimate: formatEstimate,
    ratingLabelFor: ratingLabelFor,
    buildRationale: buildRationale,
    shortlistFor: shortlistFor,
    searchOpenings: searchOpenings,
    searchOpeningFamilies: searchOpeningFamilies,
    STORAGE_KEY: STORAGE_KEY,
    loadPersistedAnswers: loadPersistedAnswers,
    savePersistedAnswers: savePersistedAnswers
  };
});
