// Wayfinder — Chess Opening Advisor
// UI/DOM layer only — question-flow and scoring logic live in engine.js.

(function () {
  "use strict";

  var DATA_URL = "wayfinder/assets/opening-catalog.json";
  var E = window.Engine;

  var state = {
    data: null,
    answers: {},
    stepIndex: 0
  };

  var appEl = document.getElementById("app");
  var rankEl = document.getElementById("rank");
  var footnoteEl = document.getElementById("data-footnote");

  function currentSteps() {
    return E.buildSteps(state.answers);
  }

  // ---- rendering: progress rank -------------------------------------------

  function renderProgress() {
    var steps = currentSteps();
    var total = 8; // one visual "rank" of 8 squares, scaled regardless of true step count
    var fraction = Math.min(state.stepIndex / steps.length, 1);
    var filled = Math.round(fraction * total);
    var squares = rankEl.querySelectorAll(".rank-square");
    squares.forEach(function (sq, i) {
      sq.classList.toggle("is-filled", i < filled);
    });
  }

  // ---- rendering: question steps ------------------------------------------

  function clearApp() {
    appEl.innerHTML = "";
  }

  function makeBackButton() {
    if (state.stepIndex === 0) return null;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "step-back";
    btn.textContent = "← Back";
    btn.addEventListener("click", function () {
      state.stepIndex -= 1;
      render();
    });
    return btn;
  }

  function makeCard(eyebrow, questionText, hint) {
    var card = document.createElement("div");
    card.className = "card";
    var back = makeBackButton();
    if (back) card.appendChild(back);

    var eb = document.createElement("p");
    eb.className = "eyebrow";
    eb.textContent = eyebrow;
    card.appendChild(eb);

    var h1 = document.createElement("h1");
    h1.className = "question";
    h1.textContent = questionText;
    card.appendChild(h1);

    if (hint) {
      var p = document.createElement("p");
      p.className = "question-hint";
      p.textContent = hint;
      card.appendChild(p);
    }
    return card;
  }

  function advance(value, key) {
    state.answers[key] = value;
    state.stepIndex += 1;
    render();
  }

  function renderChoiceStep(opts) {
    // opts: { eyebrow, question, hint, key, choices: [{value,label,sub}], columns }
    var card = makeCard(opts.eyebrow, opts.question, opts.hint);
    var list = document.createElement("div");
    list.className = "options" + (opts.columns ? " grid-2" : "");
    var current = state.answers[opts.key];

    opts.choices.forEach(function (choice) {
      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile" + (current === choice.value ? " is-selected" : "");
      var label = document.createElement("span");
      label.className = "tile-label";
      label.textContent = choice.label;
      tile.appendChild(label);
      if (choice.sub) {
        var sub = document.createElement("span");
        sub.className = "tile-sub";
        sub.textContent = choice.sub;
        tile.appendChild(sub);
      }
      tile.addEventListener("click", function () {
        advance(choice.value, opts.key);
      });
      list.appendChild(tile);
    });

    card.appendChild(list);
    appEl.appendChild(card);
  }

  function renderColorStep() {
    renderChoiceStep({
      eyebrow: "Step 1",
      question: "Which side do you want an opening for?",
      key: "color",
      columns: true,
      choices: [
        { value: "White", label: "White" },
        { value: "Black", label: "Black" }
      ]
    });
  }

  function renderFirstMovesStep() {
    var isBlack = state.answers.color === "Black";
    var card = makeCard(
      "First move(s)",
      isBlack
        ? "Which first move(s) are you preparing to face?"
        : "Which first move(s) do you want to play?",
      "Select one or more — you'll get a tailored shortlist per first move."
    );
    var list = document.createElement("div");
    list.className = "options";
    var selected = state.answers.firstMoves ? state.answers.firstMoves.slice() : [];

    E.firstMoveOptionsFor(state.answers.color).forEach(function (opt) {
      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile" + (selected.indexOf(opt.value) !== -1 ? " is-selected" : "");
      var label = document.createElement("span");
      label.className = "tile-label";
      label.textContent = opt.label;
      tile.appendChild(label);
      tile.addEventListener("click", function () {
        var idx = selected.indexOf(opt.value);
        if (idx === -1) selected.push(opt.value);
        else selected.splice(idx, 1);
        state.answers.firstMoves = selected;
        render();
      });
      list.appendChild(tile);
    });

    card.appendChild(list);

    var row = document.createElement("div");
    row.className = "continue-row";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.textContent = "Continue";
    btn.disabled = selected.length === 0;
    btn.addEventListener("click", function () {
      state.stepIndex += 1;
      render();
    });
    row.appendChild(btn);
    card.appendChild(row);

    appEl.appendChild(card);
  }

  function renderRatingStep() {
    renderChoiceStep({
      eyebrow: "Rating",
      question: "How would you describe your current level?",
      key: "rating",
      choices: E.RATING_OPTIONS
    });
  }

  function renderStudyTimeStep() {
    renderChoiceStep({
      eyebrow: "Study time",
      question: "How much time can you put into studying an opening each day?",
      key: "studyTime",
      choices: E.STUDY_TIME_OPTIONS
    });
  }

  function renderDepthStep() {
    var hint = E.isAdvancedPlus(state.answers)
      ? "At your level, this is used to exclude openings that need more theory than you'll keep up with."
      : "At your level any opening is fair game — this mainly shapes the rationale, not the shortlist.";
    renderChoiceStep({
      eyebrow: "Depth of knowledge tolerance",
      question: "How much memorization are you willing to take on?",
      hint: hint,
      key: "depth",
      choices: E.DEPTH_OPTIONS
    });
  }

  function renderTimeControlsStep() {
    var card = makeCard(
      "Time control(s)",
      "Which time control(s) do you want an opening for?",
      "Select one or more — you'll get a tailored shortlist per time control."
    );
    var list = document.createElement("div");
    list.className = "options";
    var selected = state.answers.timeControls ? state.answers.timeControls.slice() : [];

    E.TIME_CONTROL_OPTIONS.forEach(function (tc) {
      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile" + (selected.indexOf(tc) !== -1 ? " is-selected" : "");
      var label = document.createElement("span");
      label.className = "tile-label";
      label.textContent = tc;
      tile.appendChild(label);
      tile.addEventListener("click", function () {
        var idx = selected.indexOf(tc);
        if (idx === -1) selected.push(tc);
        else selected.splice(idx, 1);
        state.answers.timeControls = selected;
        render();
      });
      list.appendChild(tile);
    });

    card.appendChild(list);

    var row = document.createElement("div");
    row.className = "continue-row";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.textContent = "Continue";
    btn.disabled = selected.length === 0;
    btn.addEventListener("click", function () {
      state.stepIndex += 1;
      render();
    });
    row.appendChild(btn);
    card.appendChild(row);

    appEl.appendChild(card);
  }

  function renderStyleStep(axisId) {
    var axis = E.STYLE_AXES[axisId];
    var card = makeCard("Style", axis.question);

    var scale = document.createElement("div");
    scale.className = "scale";

    var labels = document.createElement("div");
    labels.className = "scale-labels";
    var l1 = document.createElement("span");
    l1.textContent = axis.negLabel;
    var l2 = document.createElement("span");
    l2.textContent = axis.posLabel;
    labels.appendChild(l1);
    labels.appendChild(l2);
    scale.appendChild(labels);

    var row = document.createElement("div");
    row.className = "scale-row";
    var current = state.answers.style ? state.answers.style[axisId] : undefined;

    [-2, -1, 0, 1, 2].forEach(function (val) {
      var pt = document.createElement("button");
      pt.type = "button";
      pt.className = "scale-point" + (current === val ? " is-selected" : "");
      pt.setAttribute("aria-label", String(val));
      pt.addEventListener("click", function () {
        if (!state.answers.style) state.answers.style = E.defaultStyle();
        state.answers.style[axisId] = val;
        state.stepIndex += 1;
        render();
      });
      row.appendChild(pt);
    });

    scale.appendChild(row);
    card.appendChild(scale);
    appEl.appendChild(card);
  }

  function renderLongevityStep() {
    renderChoiceStep({
      eyebrow: "Longevity",
      question: "How much do you care about an opening lasting as you improve?",
      key: "longevity",
      choices: E.LONGEVITY_OPTIONS
    });
  }

  var STEP_RENDERERS = {
    color: renderColorStep,
    firstMoves: renderFirstMovesStep,
    rating: renderRatingStep,
    studyTime: renderStudyTimeStep,
    depth: renderDepthStep,
    timeControls: renderTimeControlsStep,
    longevity: renderLongevityStep
  };

  // ---- rendering: results ---------------------------------------------------

  function renderResultsHead(answers) {
    var head = document.createElement("div");
    head.className = "results-head";
    var h1 = document.createElement("h1");
    h1.textContent = "Your " + answers.color + " shortlist";
    var p = document.createElement("p");
    p.textContent = "Top 3 per time control and first move, ranked by fit.";
    head.appendChild(h1);
    head.appendChild(p);
    return head;
  }

  function renderShortlistSection(tc, firstMoveOpt, answers, openings) {
    var section = document.createElement("section");
    section.className = "timecontrol-section";

    var title = document.createElement("h2");
    title.className = "timecontrol-title";
    title.textContent = tc + " · " + firstMoveOpt.label;
    section.appendChild(title);

    var ranked = E.shortlistFor(tc, firstMoveOpt.value, answers, openings);

    if (ranked.length === 0) {
      var note = document.createElement("p");
      note.className = "empty-note";
      note.textContent = "No openings in the sample match every filter for this time control and first move — try loosening Depth of knowledge tolerance or Rating.";
      section.appendChild(note);
    } else {
      ranked.forEach(function (entry, i) {
        section.appendChild(renderResultCard(entry.opening, i + 1, answers, entry.deeper));
      });
    }

    return section;
  }

  function renderRestartButton() {
    var restartRow = document.createElement("div");
    restartRow.className = "restart-row";
    var restartBtn = document.createElement("button");
    restartBtn.type = "button";
    restartBtn.className = "btn secondary";
    restartBtn.textContent = "Start over";
    restartBtn.addEventListener("click", function () {
      state.answers = {};
      state.stepIndex = 0;
      render();
    });
    restartRow.appendChild(restartBtn);
    return restartRow;
  }

  function renderResults() {
    var answers = state.answers;
    var openings = state.data.openings;

    appEl.appendChild(renderResultsHead(answers));
    var firstMoveOptions = E.firstMoveOptionsFor(answers.color).filter(function (opt) {
      return answers.firstMoves.indexOf(opt.value) !== -1;
    });
    answers.timeControls.forEach(function (tc) {
      firstMoveOptions.forEach(function (firstMoveOpt) {
        appEl.appendChild(renderShortlistSection(tc, firstMoveOpt, answers, openings));
      });
    });
    appEl.appendChild(renderRestartButton());
  }

  function renderDeeperList(deeper) {
    var wrap = document.createElement("div");
    wrap.className = "result-deeper";

    var label = document.createElement("p");
    label.className = "result-deeper-label";
    label.textContent = "Go deeper:";
    wrap.appendChild(label);

    var list = document.createElement("ul");
    deeper.forEach(function (entry) {
      var item = document.createElement("li");
      var name = document.createElement("span");
      name.className = "result-deeper-name";
      name.textContent = entry.opening.name;
      item.appendChild(name);
      var pgn = document.createElement("span");
      pgn.className = "result-deeper-pgn";
      pgn.textContent = entry.opening.pgn;
      item.appendChild(pgn);
      list.appendChild(item);
    });
    wrap.appendChild(list);

    return wrap;
  }

  function renderResultCard(opening, rank, answers, deeper) {
    var card = document.createElement("div");
    card.className = "result-card";

    var badge = document.createElement("div");
    badge.className = "rank-badge";
    badge.textContent = "#" + rank;
    card.appendChild(badge);

    var body = document.createElement("div");

    var name = document.createElement("div");
    name.className = "result-name";
    name.textContent = opening.name;
    body.appendChild(name);

    var meta = document.createElement("div");
    meta.className = "result-meta";
    meta.textContent = opening.eco + " · " + E.ratingLabelFor(opening.ratingBand) + " · " + opening.depthOfTheory + " theory";
    body.appendChild(meta);

    var pgn = document.createElement("div");
    pgn.className = "result-pgn";
    pgn.textContent = opening.pgn;
    body.appendChild(pgn);

    var rationale = document.createElement("p");
    rationale.className = "result-rationale";
    rationale.textContent = E.buildRationale(opening, answers);
    body.appendChild(rationale);

    if (deeper && deeper.length > 0) {
      body.appendChild(renderDeeperList(deeper));
    }

    card.appendChild(body);
    return card;
  }

  // ---- top-level render ------------------------------------------------------

  function render() {
    clearApp();
    renderProgress();

    var steps = currentSteps();
    if (state.stepIndex >= steps.length) {
      renderResults();
      return;
    }

    var stepId = steps[state.stepIndex];
    if (stepId.indexOf("style:") === 0) {
      renderStyleStep(stepId.slice(6));
      return;
    }
    STEP_RENDERERS[stepId]();
  }

  // ---- boot -------------------------------------------------------------

  fetch(DATA_URL)
    .then(function (res) {
      if (!res.ok) throw new Error("Failed to load opening data: " + res.status);
      return res.json();
    })
    .then(function (data) {
      state.data = data;
      state.answers.style = E.defaultStyle();
      footnoteEl.textContent = data.openings.length + " openings, ECO A–E · lichess-org/chess-openings (CC0)";
      render();
    })
    .catch(function (err) {
      appEl.innerHTML = "";
      var p = document.createElement("p");
      p.className = "loading";
      p.textContent = "Couldn't load opening data (" + err.message + "). Serve this page over HTTP rather than opening the file directly.";
      appEl.appendChild(p);
    });
})();
