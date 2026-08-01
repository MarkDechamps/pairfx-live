// Wayfinder — Chess Opening Advisor
// UI/DOM layer only — question-flow and scoring logic live in engine.js.

(function () {
  "use strict";

  var DATA_URL = "wayfinder/assets/opening-catalog.json";
  var E = window.Engine;

  var state = {
    data: null,
    mode: null, // null = start screen, "wizard", or "search"
    answers: {},
    stepIndex: 0,
    styleTouched: {},
    searchQuery: "",
    searchSelected: null,
    searchCaret: null
  };

  var appEl = document.getElementById("app");
  var rankEl = document.getElementById("rank");
  var footnoteEl = document.getElementById("data-footnote");

  // ---- answer persistence (wayfinder/tickets/0012) ------------------------

  function loadAnswersFromStorage() {
    var persisted = E.loadPersistedAnswers(window.localStorage);
    state.answers = persisted;
    state.styleTouched = {};
    // A persisted style axis was, by definition, explicitly set on a past
    // visit — mark it touched so its step shows the remembered value
    // pre-selected instead of looking untouched.
    if (persisted.style) {
      Object.keys(persisted.style).forEach(function (axisId) {
        state.styleTouched[axisId] = true;
      });
    }
  }

  function persistAnswers() {
    E.savePersistedAnswers(window.localStorage, state.answers);
  }

  loadAnswersFromStorage();

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

  function resetProgress() {
    var squares = rankEl.querySelectorAll(".rank-square");
    squares.forEach(function (sq) { sq.classList.remove("is-filled"); });
  }

  // ---- rendering: question steps ------------------------------------------

  function clearApp() {
    appEl.innerHTML = "";
  }

  function makeBackButton() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "step-back";
    btn.textContent = "← Back";
    if (state.stepIndex === 0) {
      btn.addEventListener("click", function () {
        state.mode = null;
        render();
      });
      return btn;
    }
    btn.addEventListener("click", function () {
      state.stepIndex -= 1;
      render();
    });
    return btn;
  }

  // No back button — used directly by the start/search screens, which have
  // their own back semantics instead of the wizard's "previous question" one.
  function makeCardShell(eyebrow, questionText, hint) {
    var card = document.createElement("div");
    card.className = "card";

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

  function makeCard(eyebrow, questionText, hint) {
    var card = makeCardShell(eyebrow, questionText, hint);
    card.insertBefore(makeBackButton(), card.firstChild);
    return card;
  }

  function renderContinueRow(isEnabled, onContinue) {
    var row = document.createElement("div");
    row.className = "continue-row";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.textContent = "Continue";
    btn.disabled = !isEnabled;
    btn.addEventListener("click", onContinue);
    row.appendChild(btn);
    return row;
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
        state.answers[opts.key] = choice.value;
        persistAnswers();
        render();
      });
      list.appendChild(tile);
    });

    card.appendChild(list);
    card.appendChild(renderContinueRow(current !== undefined, function () {
      state.stepIndex += 1;
      render();
    }));
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
        persistAnswers();
        render();
      });
      list.appendChild(tile);
    });

    card.appendChild(list);
    card.appendChild(renderContinueRow(selected.length > 0, function () {
      state.stepIndex += 1;
      render();
    }));

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
        persistAnswers();
        render();
      });
      list.appendChild(tile);
    });

    card.appendChild(list);
    card.appendChild(renderContinueRow(selected.length > 0, function () {
      state.stepIndex += 1;
      render();
    }));

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
    var touched = !!state.styleTouched[axisId];
    var current = touched ? state.answers.style[axisId] : undefined;

    [-2, -1, 0, 1, 2].forEach(function (val) {
      var pt = document.createElement("button");
      pt.type = "button";
      pt.className = "scale-point" + (current === val ? " is-selected" : "");
      pt.setAttribute("aria-label", String(val));
      pt.addEventListener("click", function () {
        if (!state.answers.style) state.answers.style = E.defaultStyle();
        state.answers.style[axisId] = val;
        state.styleTouched[axisId] = true;
        persistAnswers();
        render();
      });
      row.appendChild(pt);
    });

    scale.appendChild(row);
    card.appendChild(scale);
    card.appendChild(renderContinueRow(touched, function () {
      state.stepIndex += 1;
      render();
    }));
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
        section.appendChild(renderOpeningCard(entry.opening, {
          rank: i + 1,
          rationale: E.buildRationale(entry.opening, answers),
          deeper: entry.deeper
        }));
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
      loadAnswersFromStorage();
      state.stepIndex = 0;
      state.mode = null;
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

  // options: { rank (optional int), rationale (optional string), deeper (optional array) }
  // Shared by the wizard shortlist (rank + fit rationale) and the search
  // screen's detail card (no rank, a study-time estimate instead of a
  // rationale) — wayfinder/tickets/0013.
  function renderOpeningCard(opening, options) {
    options = options || {};
    var card = document.createElement("div");
    // .result-card's grid reserves a rank-badge column; without a rank
    // (the search screen's detail card) that column would otherwise still
    // claim the body, squeezing all its text into ~44px.
    card.className = "result-card" + (options.rank ? "" : " result-card--no-rank");

    if (options.rank) {
      var badge = document.createElement("div");
      badge.className = "rank-badge";
      badge.textContent = "#" + options.rank;
      card.appendChild(badge);
    }

    var body = document.createElement("div");

    var name = document.createElement("div");
    name.className = "result-name";
    name.textContent = opening.name;
    body.appendChild(name);

    var meta = document.createElement("div");
    meta.className = "result-meta";
    meta.textContent = opening.color + " · " + opening.eco + " · " + E.ratingLabelFor(opening.ratingBand) + " · " + opening.depthOfTheory + " theory";
    body.appendChild(meta);

    var pgn = document.createElement("div");
    pgn.className = "result-pgn";
    pgn.textContent = opening.pgn;
    body.appendChild(pgn);

    if (opening.overview) {
      var overview = document.createElement("p");
      overview.className = "result-overview";
      overview.textContent = opening.overview;
      body.appendChild(overview);
    }

    if (options.rationale) {
      var rationale = document.createElement("p");
      rationale.className = "result-rationale";
      rationale.textContent = options.rationale;
      body.appendChild(rationale);
    }

    if (opening.reputationNotes) {
      var reputation = document.createElement("div");
      reputation.className = "result-reputation";
      var reputationLabel = document.createElement("span");
      reputationLabel.className = "result-reputation-label";
      reputationLabel.textContent = "Reputation";
      reputation.appendChild(reputationLabel);
      var reputationText = document.createElement("p");
      reputationText.textContent = opening.reputationNotes;
      reputation.appendChild(reputationText);
      body.appendChild(reputation);
    }

    if (options.deeper && options.deeper.length > 0) {
      body.appendChild(renderDeeperList(options.deeper));
    }

    card.appendChild(body);
    return card;
  }

  // ---- rendering: start screen (wayfinder/tickets/0011) -----------------------

  function makeStartOption(title, sub, onSelect) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "start-option";
    var titleEl = document.createElement("span");
    titleEl.className = "start-option-title";
    titleEl.textContent = title;
    btn.appendChild(titleEl);
    var subEl = document.createElement("span");
    subEl.className = "start-option-sub";
    subEl.textContent = sub;
    btn.appendChild(subEl);
    btn.addEventListener("click", onSelect);
    return btn;
  }

  function renderStartScreen() {
    var card = makeCardShell("PairFX Opening Selector", "How do you want to start?");

    var options = document.createElement("div");
    options.className = "start-options";
    options.appendChild(makeStartOption(
      "Guided wizard",
      "Answer a few questions and get a ranked shortlist tailored to you.",
      function () {
        state.mode = "wizard";
        render();
      }
    ));
    options.appendChild(makeStartOption(
      "Search openings",
      "Already know what you're after? Look it up directly.",
      function () {
        state.mode = "search";
        state.searchQuery = "";
        state.searchSelected = null;
        state.searchCaret = null;
        render();
      }
    ));
    card.appendChild(options);

    appEl.appendChild(card);
  }

  // ---- rendering: search screen (wayfinder/tickets/0013) ----------------------

  function renderSearchDetail(family) {
    appEl.appendChild(renderOpeningCard(family.opening, {
      rationale: E.formatEstimate(family.opening.estimatedHoursToCompetency, state.answers.studyTime),
      deeper: family.deeper
    }));
  }

  function renderSearchResults(query) {
    var families = E.searchOpeningFamilies(query, state.data.openings);
    var list = document.createElement("div");
    list.className = "search-results";

    if (families.length === 0) {
      var note = document.createElement("p");
      note.className = "empty-note";
      note.textContent = "No openings match \"" + query.trim() + "\".";
      list.appendChild(note);
      return list;
    }

    families.forEach(function (family) {
      var opening = family.opening;
      var item = document.createElement("button");
      item.type = "button";
      item.className = "search-result";
      var name = document.createElement("span");
      name.className = "search-result-name";
      name.textContent = opening.name;
      item.appendChild(name);
      var meta = document.createElement("span");
      meta.className = "search-result-meta";
      meta.textContent = opening.color + " · " + opening.eco +
        (family.deeper.length > 0 ? " · +" + family.deeper.length + " more" : "");
      item.appendChild(meta);
      item.addEventListener("click", function () {
        state.searchSelected = family;
        render();
      });
      list.appendChild(item);
    });
    return list;
  }

  function renderSearchScreen() {
    var card = makeCardShell("Search openings", state.searchSelected ? "Here's what we know" : "Which opening are you looking for?");

    var back = document.createElement("button");
    back.type = "button";
    back.className = "step-back";
    back.textContent = "← Back";
    back.addEventListener("click", function () {
      if (state.searchSelected) {
        state.searchSelected = null;
        state.searchQuery = "";
        state.searchCaret = null;
      } else {
        state.mode = null;
      }
      render();
    });
    card.insertBefore(back, card.firstChild);

    appEl.appendChild(card);

    if (state.searchSelected) {
      renderSearchDetail(state.searchSelected);
      return;
    }

    var input = document.createElement("input");
    input.type = "search";
    input.className = "search-input";
    input.placeholder = "Start typing an opening name…";
    input.value = state.searchQuery || "";
    input.addEventListener("input", function (e) {
      state.searchQuery = e.target.value;
      state.searchCaret = e.target.selectionStart;
      render();
    });
    card.appendChild(input);

    if (state.searchQuery && state.searchQuery.trim()) {
      card.appendChild(renderSearchResults(state.searchQuery));
    }

    // A full re-render on every keystroke (this app's usual pattern) would
    // otherwise steal focus and caret position from the input the user is
    // actively typing into.
    input.focus();
    if (typeof state.searchCaret === "number") {
      input.setSelectionRange(state.searchCaret, state.searchCaret);
    }
  }

  // ---- top-level render ------------------------------------------------------

  function render() {
    clearApp();

    if (state.mode === null) {
      resetProgress();
      renderStartScreen();
      return;
    }

    if (state.mode === "search") {
      resetProgress();
      renderSearchScreen();
      return;
    }

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
