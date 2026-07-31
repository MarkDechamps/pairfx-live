"""ECO volume E family data — wayfinder/tickets/0010-rescore-volume-e.md.
Owned exclusively by this file: no other volume file edits these keys,
so parallel work across volumes never conflicts here.
"""

FAMILY_TAGS = {
    "Blumenfeld Countergambit": ("Black", 1, 2, 1, 0, 0, 3, 2),
    "Blumenfeld Countergambit Accepted": ("Black", 1, 2, 2, 0, 0, 3, 2),
    "Bogo-Indian Defense": ("Black", -1, -1, -1, -1, 1, 2, 2),
    "Catalan Opening": ("White", -1, -1, 0, -1, 2, 4, 3),
    "King's Indian Defense": ("Black", 2, 2, 2, 2, 0, 4, 3),
    "Nimzo-Indian Defense": ("Black", -1, -1, 0, -1, 2, 4, 3),
    "Queen's Indian Defense": ("Black", -1, -1, -1, -1, 1, 3, 2),
    "Queen's Indian Defense, with e3": ("Black", -1, -1, -1, -2, 1, 2, 2),
    "Queen's Indian Defense, with e3, Bb4+ Line": ("Black", -1, -1, -1, -2, 1, 2, 2),
    "Queen's Pawn, Mengarini Attack": ("White", 0, 0, 0, 0, -2, 1, 1),
}

FAMILY_OVERVIEW = {
    "Blumenfeld Countergambit": "The Blumenfeld Countergambit (1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nf3 b5) is a sharp reply "
        "to the Queen's Pawn Game in which Black offers a queenside pawn to build an "
        "imposing pawn center (c5/d5/e6-type structures) and open lines for the bishop on "
        "b7 and a half-open f-file. That mix of central space and open lines for Black's "
        "pieces is why it earns tactical, initiative-seeking tags rather than a purely "
        "positional label, though White's extra material makes the resulting middlegame "
        "genuinely double-edged rather than one-sided in Black's favor.",
    "Blumenfeld Countergambit Accepted": "After 4...b5 5.dxe6 fxe6 6.cxb5, Black concretely gives up the b5-pawn to complete "
        "the same central-domination plan the Blumenfeld aims for, ending up with a strong "
        "pawn center and open f-file compensation against White's extra queenside pawn. It "
        "is the most direct, most tested branch of the Blumenfeld complex and inherits the "
        "family's dynamic, initiative-based compensation in sharper, more concrete form, "
        "since the material has actually changed hands rather than merely being offered.",
    "Bogo-Indian Defense": "The Bogo-Indian Defense (1.d4 Nf6 2.c4 e6 3.Nf3 Bb4+) arises when White meets the "
        "Indian setup with Nf3 instead of Nc3, sidestepping the Nimzo-Indian; Black's early "
        "check invites White to block with Bd2 or Nbd2, after which Black settles for solid "
        "development rather than the sharper imbalances of the Nimzo. It plays as a calmer, "
        "lower-maintenance cousin of the Nimzo-Indian, trading away some of that opening's "
        "dynamic potential for structural simplicity and a straightforward plan.",
    "Catalan Opening": "The Catalan Opening (1.d4 Nf6 2.c4 e6 3.g3) combines Queen's Gambit-style central "
        "play with a kingside fianchetto of the king's bishop, aiming the long diagonal at "
        "Black's queenside while keeping White's own king safe. Against the Open Catalan "
        "(...dxc4) White accepts a long-term struggle to regain the pawn with lasting "
        "positional pressure, while the Closed Catalan gives Black a solid but somewhat "
        "cramped position; that blend of patient strategic squeezing with sharp, concrete "
        "theory around the c4 pawn is why it earns both positional and genuinely deep tags.",
    "King's Indian Defense": "The King's Indian Defense (1.d4 Nf6 2.c4 g6) is the quintessential hypermodern "
        "reply to 1.d4: Black lets White build a full pawn center and then attacks it with "
        "pieces and pawn breaks, most famously racing pawn storms on opposite wings after "
        "...O-O, ...e5, or ...c5. Because the resulting middlegames are built around "
        "opposite-side attacking plans and committal pawn breaks rather than gradual "
        "maneuvering, the family earns some of the sharpest, most dynamic, and most "
        "consequential tags of any defense in the catalog — a single lost tempo in the race "
        "can decide the game outright.",
    "Nimzo-Indian Defense": "The Nimzo-Indian Defense (1.d4 Nf6 2.c4 e6 3.Nc3 Bb4), developed by Aron "
        "Nimzowitsch, pins White's knight on c3 to deter e4 and typically trades the bishop "
        "for that knight, handing White the bishop pair but saddling White with doubled "
        "c-pawns that Black targets with light-square pressure and eventual blockade. That "
        "core trade-off — durable structural damage to White for the loss of Black's own "
        "bishop pair — makes it one of the most strategically rich, thoroughly explored "
        "defenses to 1.d4, which is reflected in its depth and rating tags.",
    "Queen's Indian Defense": "The Queen's Indian Defense (1.d4 Nf6 2.c4 e6 3.Nf3 b6) is Black's hypermodern "
        "answer when White avoids Nc3, fianchettoing the queen's bishop to contest the key "
        "light squares e4 and d5 with pieces rather than pawns. It is built for solidity "
        "rather than imbalance — Black isn't trying to seize the initiative so much as "
        "neutralize White's center and reach a comfortable, roughly equal middlegame — "
        "which is why it earns consistently modest, low-risk tags across the board.",
    "Queen's Indian Defense, with e3": "This branch covers White meeting the Queen's Indian setup with a modest e3 rather "
        "than the sharper kingside fianchetto (g3), developing quietly with Bd3, O-O, and "
        "c4 rather than fighting for the long diagonal. For Black this removes some of the "
        "sharper theoretical debates found in the main Queen's Indian (like the "
        "Kasparov-Petrosian 4.a3 lines) in favor of a calmer, more maneuvering game, which "
        "is why it reads as even more solid and less demanding than the family's core lines.",
    "Queen's Indian Defense, with e3, Bb4+ Line": "Here Black interpolates ...Bb4+ before ...b6 (1.d4 Nf6 2.c4 e6 3.Nf3 Bb4+ 4.Nbd2 "
        "b6 5.e3 Bb7), forcing White's knight to the slightly passive d2 square before "
        "transposing into the same quiet e3 structures as the rest of this branch. The "
        "extra check is a minor move-order refinement rather than a change in character, so "
        "it inherits the calm, low-risk profile of the broader e3 systems it feeds into.",
    "Queen's Pawn, Mengarini Attack": "The Mengarini Attack (1.d4 Nf6 2.c4 g6 3.Qc2) brings White's queen out early "
        "against a King's Indian-style setup, most often preparing a quick e4 without first "
        "committing the knight to c3. Bringing the queen out this early runs against "
        "ordinary opening principles (development, king safety) without buying enough "
        "concrete compensation, which is why it earns some of the lowest health and rating "
        "tags in the catalog.",
}

FAMILY_REPUTATION = {
    "Blumenfeld Countergambit": "Named for Russian master Benjamin Blumenfeld and later adopted by World Champion "
        "Alexander Alekhine, it has real historical pedigree, but it has never become a "
        "mainstream weapon and is rarely seen in contemporary elite practice; treat it as a "
        "specialist surprise weapon rather than a default choice against 1.d4 (Wikipedia's "
        "Blumenfeld Gambit article).",
    "Blumenfeld Countergambit Accepted": "This is the branch that actually tests whether Black's compensation is real, since "
        "White has banked the extra pawn; it's regarded as sound rather than refuted, but "
        "engines show White can consolidate with careful play, so it remains a niche choice "
        "for players who enjoy playing pawn-down for durable, long-term initiative.",
    "Bogo-Indian Defense": "Long considered a fully sound, if slightly modest, alternative to the Nimzo-Indian "
        "— it has been used by Nimzowitsch, Keres, Petrosian, Smyslov, and Korchnoi, and "
        "more recently by Michael Adams and Nikita Vitiugov (per Wikipedia's Bogo-Indian "
        "Defence article) — but databases cited there show it played only about half as "
        "often as the Queen's Indian, reflecting its status as a solid backup rather than a "
        "primary weapon.",
    "Catalan Opening": "Far from a niche sideline, the Catalan is a current top-level mainstay: Kramnik, "
        "Anand, and Carlsen have all used it in world championship play, and Carlsen made "
        "it his primary weapon against 1...Nf6/e6 setups in the late 2010s, alongside "
        "regular use by Caruana and Dubov (per Wikipedia's Catalan Opening article) — it is "
        "as healthy at the very top today as it has ever been.",
    "King's Indian Defense": "The King's Indian has a genuinely up-and-down reputation at the very top: per "
        "Wikipedia's King's Indian Defence article it was the main weapon of Fischer, "
        "Kasparov, and Tal, but Kasparov largely abandoned it after repeated losses to "
        "Kramnik's calm handling in the early 2000s; it has since recovered in the hands of "
        "Nakamura, Radjabov, and Ding Liren (with Kramnik himself scoring a notable win with "
        "it in 2012), so it's best described as a fully viable but high-variance choice "
        "whose top-level fortunes swing with current theory rather than a settled, "
        "always-safe mainstay.",
    "Nimzo-Indian Defense": "It is about as healthy as an opening gets: per Wikipedia's Nimzo-Indian Defence "
        "article it has been played by every world champion since Capablanca, and both main "
        "tries against it (4.e3 Rubinstein and 4.Qc2, revived heavily in the 1990s and now "
        "just as popular) remain fully respected at the top; its reputation is strong enough "
        "that many White players now reach for 3.Nf3 or 3.g3 specifically to sidestep it.",
    "Queen's Indian Defense": "Often called the Nimzo-Indian's 'sister opening' (per Wikipedia's Queen's Indian "
        "Defense article), the classical 4...Bb7 line is well known for its drawish "
        "reputation and has long been used by Black specifically as a safe way to hold with "
        "the black pieces; the more ambitious 4...Ba6 became the topical main line in the "
        "1980s and remains the more fashionable modern try, but the family's core identity "
        "as a rock-solid, slightly passive defense hasn't changed.",
    "Queen's Indian Defense, with e3": "Named lines like the Spassky System (4.e3) show it has genuine elite pedigree, but "
        "it's generally regarded as White's quieter, lower-pressure try rather than a "
        "critical theoretical test — a practical choice for players who want a safe, simple "
        "game rather than a fight for the advantage.",
    "Queen's Indian Defense, with e3, Bb4+ Line": "It's a common practical device for Black to reach the e3 Queen's Indian structures "
        "on favorable terms (denying White the option of meeting ...Bb4+ later with a3) "
        "rather than an independent theoretical battleground in its own right.",
    "Queen's Pawn, Mengarini Attack": "It is essentially unseen in serious modern practice — a curiosity move order "
        "rather than a tested weapon — and is best understood as an offbeat try for players "
        "looking to dodge mainstream King's Indian/Grünfeld theory rather than a line with "
        "any real independent reputation.",
}

NOTABLE_SUBVARIATIONS = {
    "Bogo-Indian Defense: Monticelli Trap": {
        "overview": (
            "The Monticelli Trap (1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3 Bb7 5.Bg2 Bb4+ 6.Bd2 Bxd2+ "
            "7.Qxd2 O-O 8.Nc3 Ne4 9.Qc2 Nxc3 10.Ng5!) is a concrete tactical trick hiding "
            "inside an otherwise placid Bogo-Indian move order: after Black grabs the knight "
            "on c3, White's queen and knight combine to win material (10.Ng5 hits h7 and the "
            "loose knight) unless Black has memorized the refutation. It is a sharp tactical "
            "pocket embedded in a family that is otherwise about quiet, positional development."
        ),
        "reputationNotes": (
            "It's a known trap for the underprepared rather than a real theoretical "
            "battleground — strong players simply avoid taking on c3 in this move order, so "
            "it mostly claims scalps at club level rather than shaping grandmaster praxis."
        ),
        "tacticalVsPositional": 2,
        "riskTolerance": 1,
        "dynamicVsStatic": 1,
        "forgivingVsPunishing": 2,
        "healthAtHigherLevels": -1,
        "ratingBand": 2,
    },
    "Catalan Opening: Hungarian Gambit": {
        "overview": (
            "The Hungarian Gambit (1.d4 Nf6 2.c4 e6 3.g3 e5!?) is Black's attempt to strike "
            "back in the center with ...e5 before White's fianchetto is complete, offering a "
            "pawn for quick development and activity rather than allowing the normal Catalan "
            "bind to take hold. It flips the Catalan's usual script — instead of White "
            "grinding structurally, Black tries to seize the initiative immediately, making "
            "this line noticeably sharper and more tactical than the rest of the family."
        ),
        "reputationNotes": (
            "It's a rare, surprise-value try rather than a respected main line — accurate "
            "play lets White simply keep the extra pawn with a comfortable position, so it "
            "shows up occasionally as a blitz/rapid weapon but has little standing in "
            "serious top-level theory."
        ),
        "tacticalVsPositional": 1,
        "riskTolerance": 1,
        "dynamicVsStatic": 1,
        "forgivingVsPunishing": 1,
        "healthAtHigherLevels": -1,
        "ratingBand": 3,
    },
    "King's Indian Defense: Sämisch Variation": {
        "overview": (
            "The Sämisch Variation (5.f3, aiming for Be3, Qd2, and long castling) is White's "
            "most uncompromising try against the King's Indian, using f3 to support an "
            "e4-based center and setting up an unapologetic queenside-vs-kingside pawn-storm "
            "race once both sides castle on opposite wings. It represents the sharpest, most "
            "opposite-castling-committed expression of the King's Indian's already-dynamic "
            "character."
        ),
        "reputationNotes": (
            "It has been played by a remarkable run of world champions — Botvinnik, Tal, "
            "Petrosian, Spassky, Karpov, and Kasparov all used it — and remains one of the "
            "critical main tries against the King's Indian, prized by attacking players "
            "willing to accept that one slow move in the resulting race can be fatal for "
            "either side."
        ),
        "tacticalVsPositional": 2,
        "riskTolerance": 2,
        "dynamicVsStatic": 2,
        "forgivingVsPunishing": 2,
        "healthAtHigherLevels": 1,
        "ratingBand": 4,
    },
    "King's Indian Defense: Four Pawns Attack": {
        "overview": (
            "The Four Pawns Attack (5.f4) is White's most territorially ambitious try "
            "against the King's Indian, grabbing a four-pawn center (c4/d4/e4/f4) in the "
            "hope of overwhelming Black before development catches up. It's the single most "
            "extreme, highest-risk expression of the whole King's Indian complex — for White "
            "it's all-or-nothing central space, and for Black it's a standing invitation to "
            "counterattack the center before it consolidates."
        ),
        "reputationNotes": (
            "It has a reputation as objectively double-edged rather than simply strong: "
            "well-prepared Black players are generally considered to equalize or better by "
            "hitting the overextended center quickly, which is why it appears far less often "
            "at elite level than the calmer Fianchetto or the classical main lines, even "
            "though it remains a fully respectable practical try at club and master level."
        ),
        "tacticalVsPositional": 2,
        "riskTolerance": 2,
        "dynamicVsStatic": 2,
        "forgivingVsPunishing": 2,
        "healthAtHigherLevels": -1,
        "ratingBand": 4,
    },
    "King's Indian Defense: Fianchetto Variation": {
        "overview": (
            "The Fianchetto Variation (3.Nf3 Bg7 4.g3, or the same setup via 3.g3) meets the "
            "King's Indian with White's own kingside fianchetto, aiming for a solid, "
            "flexible structure that blunts Black's usual kingside pawn-storm dreams and "
            "instead steers the game toward long, patient strategic maneuvering. It is a "
            "deliberately calmer, more positional counterpoint to the King's Indian family's "
            "typically explosive character."
        ),
        "reputationNotes": (
            "It is described as the single most popular try against the King's Indian at "
            "grandmaster level today, valued precisely because it avoids the wild "
            "opposite-side races of the Sämisch or Classical lines while still posing Black "
            "real long-term problems — a strategic choice for White players who want an edge "
            "without a coin flip."
        ),
        "tacticalVsPositional": -1,
        "riskTolerance": -1,
        "dynamicVsStatic": 0,
        "forgivingVsPunishing": -1,
        "healthAtHigherLevels": 2,
        "ratingBand": 4,
    },
}
