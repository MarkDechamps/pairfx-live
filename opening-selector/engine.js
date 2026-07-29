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
    { value: "under30", label: "Under 30 min/day", hoursPerDay: 0.4 },
    { value: "30to60", label: "30-60 min/day", hoursPerDay: 0.75 },
    { value: "1to2", label: "1-2 hours/day", hoursPerDay: 1.5 },
    { value: "2plus", label: "2+ hours/day", hoursPerDay: 2.5 }
  ];

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
    var steps = ["color", "rating", "studyTime", "depth", "timeControls"];
    styleAxesForFlow(answers).forEach(function (axis) {
      steps.push("style:" + axis);
    });
    steps.push("longevity");
    return steps;
  }

  function defaultStyle() {
    return { tacticalVsPositional: 0, riskTolerance: 0, dynamicVsStatic: 0, forgivingVsPunishing: 0 };
  }

  function passesHardFilters(opening, answers, timeControl) {
    if (opening.color !== answers.color) return false;
    if (opening.timeControls.indexOf(timeControl) === -1) return false;
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

  function formatEstimate(hoursToCompetency, studyTimeValue) {
    var hoursPerDay = hoursPerDayFor(studyTimeValue);
    var days = Math.max(1, Math.ceil(hoursToCompetency / hoursPerDay));
    if (days < 14) return "about " + days + " day" + (days === 1 ? "" : "s") + " at your pace";
    var weeks = Math.round(days / 7);
    return "about " + weeks + " weeks at your pace";
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

  function shortlistFor(timeControl, answers, openings) {
    return openings
      .filter(function (o) { return passesHardFilters(o, answers, timeControl); })
      .map(function (o) { return { opening: o, score: scoreOpening(o, answers) }; })
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
    shortlistFor: shortlistFor
  };
});
