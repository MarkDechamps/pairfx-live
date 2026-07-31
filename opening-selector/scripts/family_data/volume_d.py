"""ECO volume D family data — wayfinder/tickets/0009-rescore-volume-d.md.
Owned exclusively by this file: no other volume file edits these keys,
so parallel work across volumes never conflicts here.
"""

FAMILY_TAGS = {
    "Blackmar-Diemer Gambit": ("White", 2, 2, 2, 1, -2, 2, 2),
    "Blackmar-Diemer Gambit Accepted": ("White", 2, 2, 2, 1, -2, 2, 2),
    "Blackmar-Diemer Gambit Declined": ("White", 1, 1, 1, 0, -1, 2, 2),
    "Neo-Grünfeld Defense": ("Black", 0, 0, 0, 0, 1, 3, 2),
    "Queen's Gambit": ("White", -1, -1, -1, -1, 2, 3, 2),
    "Queen's Gambit Accepted": ("White", 0, -1, 0, -1, 2, 3, 2),
    "Queen's Gambit Declined": ("White", -1, -1, -1, -1, 2, 3, 3),
    "Rapport-Jobava System": ("White", 1, 1, 1, 0, 1, 2, 2),
    "Rapport-Jobava System, with e6": ("White", 1, 0, 1, 0, 1, 2, 2),
    "Richter-Veresov Attack": ("White", 1, 1, 1, 0, 0, 2, 2),
    "Rubinstein Opening": ("White", -1, -1, -1, -1, 0, 2, 2),
    "Semi-Slav Defense": ("Black", 0, 0, 1, -1, 2, 4, 3),
    "Semi-Slav Defense Accepted": ("Black", 1, 1, 1, -2, 2, 4, 3),
    "Slav Defense": ("Black", -2, -2, -2, -1, 2, 3, 3),
    "Tarrasch Defense": ("Black", 1, 1, 1, 0, 1, 3, 2),
}

FAMILY_OVERVIEW = {
    "Blackmar-Diemer Gambit": "The Blackmar-Diemer Gambit meets 1.d4 d5 with 2.e4, offering a pawn "
        "immediately for a lead in development and open lines toward Black's "
        "king. After 2...dxe4 3.Nc3, White regains a tempo and looks to blast "
        "open the f-file with f3 before Black can consolidate. It is a "
        "deliberately imbalanced, attacking try rather than a positional bid "
        "for equality — trading material for time and initiative from the "
        "opening's first moves.",
    "Blackmar-Diemer Gambit Accepted": "This is the critical test of the Blackmar-Diemer: after 3...Nf6 4.f3, "
        "Black grabs the second pawn with 4...exf3, and White recaptures on f3 "
        "to complete rapid development at the cost of two pawns. It leads to "
        "the sharpest, most forced positions the gambit produces, where "
        "White's entire compensation rests on quick piece activity and attacking "
        "chances against an uncastled or undeveloped Black king.",
    "Blackmar-Diemer Gambit Declined": "Here Black sidesteps the main test by not grabbing the f3 pawn after "
        "4.f3, instead playing quieter moves that keep the extra e4 pawn "
        "without over-extending. It is calmer and less forced than the "
        "Accepted lines — White still gets some development lead, but the "
        "position is closer to a normal, slightly worse-for-White gambit "
        "structure than an all-in attack.",
    "Neo-Grünfeld Defense": "The Neo-Grünfeld covers White's attempts to reach Grünfeld-style "
        "structures (1.d4 Nf6 2.c4 g6 3...d5) while delaying or avoiding Nc3, "
        "most commonly via 3.f3, 3.Nf3, or 3.g3. By sidestepping the note-perfect "
        "theory of the Grünfeld's main Exchange Variation, White reaches a "
        "quieter, more maneuvering game built around fianchettoing the "
        "king's bishop rather than the sharp central collision of the "
        "classical Grünfeld.",
    "Queen's Gambit": "1.d4 d5 2.c4 is only a 'gambit' in name — Black cannot hold the "
        "c4-pawn without conceding a worse position, so the real fight is "
        "positional: White presses for central and spatial control while "
        "Black looks to free the game with ...c5 or ...e5 breaks. It's one "
        "of the oldest, most thoroughly explored tries against 1...d5, and "
        "the umbrella under which Black must choose to accept, decline, or "
        "counter-gambit.",
    "Queen's Gambit Accepted": "Black plays 2...dxc4, temporarily grabbing a pawn to loosen "
        "White's centre before returning it once White plays to reclaim it "
        "(commonly with e3/e4 and Bxc4). The resulting positions mix "
        "positional and tactical ideas around an isolated queen's pawn or "
        "quick central liquidation, giving both sides real chances rather "
        "than the more static structures of the Declined lines.",
    "Queen's Gambit Declined": "Black meets 2.c4 with 2...e6, keeping the d5-pawn defended and "
        "accepting a slightly cramped but very solid position. The fight "
        "centres on Black's problem light-squared bishop and White's "
        "attempts to exploit it, with Black looking to trade pieces and "
        "break with ...c5. It's the classical, deeply respected backbone of "
        "Black's defenses to 1.d4, prized for reliability over sharpness.",
    "Rapport-Jobava System": "White develops the queenside knight before the bishop with 1.d4 d5 "
        "2.Nc3 Nf6 3.Bf4 — a reordering of the standard London System that "
        "keeps the same easy-to-learn structure but adds real attacking "
        "options (Nb5, h4-h5, opposite-side castling) the classical London "
        "never had. It trades a little of the London's placidity for "
        "genuine, quickly-arising winning chances.",
    "Rapport-Jobava System, with e6": "The same Nc3-before-Bf4 idea, but Black meets it with 2...e6 "
        "instead of 2...Nf6, delaying the knight and slightly blunting some "
        "of White's sharpest early tricks (an immediate Nb5 or quick "
        "kingside pawn storm targeting an already-developed knight). "
        "Positions stay recognisably the same system, just a shade calmer "
        "than the main move order.",
    "Richter-Veresov Attack": "1.d4 d5 2.Nc3 Nf6 3.Bg5 develops quickly and keeps options open "
        "between Richter's plan of f3/e4 to build a big pawn centre and "
        "Veresov's Bxf6, damaging Black's structure outright. It plays more "
        "like a queen's-pawn opening with king's-pawn instincts — quick "
        "development, castling long, and going straight for a kingside or "
        "central initiative rather than slow manoeuvring.",
    "Rubinstein Opening": "A quiet, flexible queen's-pawn system built around an early e3 "
        "(1.d4 Nf6/d5 2.Nf3 e6/Nf6 3.e3), keeping options open to transpose "
        "into Colle-, Zukertort-, or QGD-like structures depending on how "
        "Black sets up. It asks for very little memorised theory in "
        "exchange for a solid, hard-to-refute position — a practical choice "
        "for players who'd rather understand a few recurring plans than "
        "memorise forcing lines.",
    "Semi-Slav Defense": "Black combines c6 and e6 (1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 e6), "
        "keeping the light-squared bishop's diagonal open longer than a "
        "pure Queen's Gambit Declined while still supporting a solid "
        "centre. It's a rich hybrid structure that gives up a little of the "
        "Slav's simplicity for genuine dynamic chances on both wings, and "
        "it remains one of the main theoretical battlegrounds against 1.d4.",
    "Semi-Slav Defense Accepted": "Here Black meets White's 5.Bg5 by grabbing the c4-pawn immediately "
        "(5...dxc4), the move that opens the door to the sharpest parts of "
        "Semi-Slav theory — most directly White's thematic 6.e4 push. This "
        "is a far more forcing, theory-dependent branch point than the "
        "quieter Semi-Slav setups that decline the pawn, and from here the "
        "game can turn extremely sharp very quickly.",
    "Slav Defense": "1.d4 d5 2.c4 c6 defends the d5-pawn without blocking in the "
        "light-squared bishop, which Black can develop actively to f5 or "
        "g4 before playing ...e6 — solving the exact problem that dogs the "
        "orthodox Queen's Gambit Declined. It's a fundamentally solid, "
        "positional structure, but extremely well worked out, with deep "
        "and current theory at the highest level.",
    "Tarrasch Defense": "Black meets 1.d4 d5 2.c4 e6 3.Nc3 with 3...c5, accepting an "
        "isolated d-pawn after the central exchanges in return for open "
        "lines, active piece play, and a real bid for central space rather "
        "than a cramped, purely defensive setup. The resulting isolated "
        "queen's-pawn middlegames are genuinely double-edged: Black's "
        "activity can turn into a real attack, but the pawn itself can "
        "become a long-term liability if the position simplifies.",
}

FAMILY_REPUTATION = {
    "Blackmar-Diemer Gambit": "Widely dismissed by strong players as objectively unsound — theory "
        "holds that Black has several ways to equalize or better with "
        "accurate defense, and it is essentially absent from serious "
        "grandmaster practice. It remains genuinely popular among club and "
        "online players, who value the ready-made attacking chances it "
        "creates against unprepared opponents.",
    "Blackmar-Diemer Gambit Accepted": "The most thoroughly analyzed and most confidently dismissed branch "
        "of the BDG at master level: precise defense is considered to "
        "neutralize White's compensation for the two pawns. Still a "
        "practical favourite below master level, where the resulting open "
        "positions punish unprepared or slow defense.",
    "Blackmar-Diemer Gambit Declined": "Regarded as Black's simplest, safest way to handle the BDG — "
        "keeping the extra pawn without walking into White's most forced "
        "attacking tries. Less theoretically charged than the Accepted "
        "lines, and correspondingly less of a target for BDG specialists' "
        "prepared attacks.",
    "Neo-Grünfeld Defense": "A respected, if secondary, alternative to the main Grünfeld's "
        "well-tested Exchange Variation. White chooses it specifically to "
        "sidestep that heavily analyzed main line, trading some critical "
        "bite for less-charted, more maneuvering positions; it isn't the "
        "primary weapon of the Grünfeld's top practitioners but is a sound, "
        "occasionally used way to dodge their preparation.",
    "Queen's Gambit": "One of the most enduring, respected openings in chess — a mainstay "
        "of world-championship play since the 1920s (it covered all but two "
        "games of the 1927 Capablanca-Alekhine match) and still a completely "
        "sound, frequently played choice at every level today, even though "
        "Indian defenses have taken some of its share of top-level "
        "popularity since the mid-20th century.",
    "Queen's Gambit Accepted": "Considered slightly dubious in the early twentieth century, the "
        "QGA was rehabilitated by the 1990s and is now firmly established "
        "as a sound main-line choice — a number of world-elite players "
        "adopted it into their repertoires from that point on, and it "
        "remains the third most common reply to 1.d4 today.",
    "Queen's Gambit Declined": "Has the reputation of being one of Black's single most reliable "
        "defenses to 1.d4 — thoroughly sound at every level, still "
        "extensively used by grandmasters, and historically dominant enough "
        "to have appeared in nearly every game of the 1927 world "
        "championship match.",
    "Rapport-Jobava System": "Long neglected, the system was revived and popularized at the "
        "elite level by Baadur Jobava starting around 2013 — including wins "
        "over Topalov and Ponomariov — and later taken up by Richard "
        "Rapport, giving it real top-level pedigree as a practical surprise "
        "weapon rather than just a club-level try.",
    "Rapport-Jobava System, with e6": "Shares the parent system's reputation as a modern, GM-endorsed "
        "surprise weapon; the e6 move order is simply the calmer of the two "
        "main replies, since it avoids committing the knight to f6 early "
        "and so defuses a few of White's sharpest tactical tries.",
    "Richter-Veresov Attack": "Never a top-level mainstay, but never refuted either — Spassky, "
        "Tal, Karpov, and Bronstein have all used it as an occasional "
        "surprise weapon, and specialists like Jonny Hector and Alexander "
        "Morozevich have kept it in active practical use. At club level it "
        "has a steady following as a sound way to reach original positions "
        "quickly.",
    "Rubinstein Opening": "A modest, low-profile system rather than a headline weapon — it "
        "doesn't carry the theoretical weight of the sharper 1.d4 tries, "
        "but it isn't dubious either. Its appeal is practical: club players "
        "reach for it precisely because it demands far less rote "
        "memorization than mainstream Queen's Gambit theory while still "
        "being perfectly sound.",
    "Semi-Slav Defense": "A fully current, top-level main line against 1.d4 — its main "
        "branches (Meran, Anti-Moscow) see continuous modern grandmaster "
        "attention specifically because the resulting play resists early "
        "simplification, appealing to players who want genuine winning "
        "chances rather than a quick draw.",
    "Semi-Slav Defense Accepted": "The gateway into the Semi-Slav's most theory-heavy territory — "
        "engagement here quickly leads toward some of the deepest-analyzed "
        "positions in the entire opening, so it rewards specific "
        "preparation far more than general understanding and can punish an "
        "underprepared player very quickly.",
    "Slav Defense": "One of the most respected defenses in chess history — played by "
        "eleven of the first thirteen world champions, a particular "
        "favourite of Botvinnik and Smyslov, and still a first-choice "
        "weapon for elite players today (Kramnik used it in six of his "
        "eight Black games in the 2006 world championship match).",
    "Tarrasch Defense": "Considered fully sound today after decades of debate — early "
        "masters largely rejected it for its structural pawn weakness, but "
        "modern theory (and its use as a real world-championship weapon in "
        "the 1980s) rehabilitated it. It's a respected, occasionally used "
        "choice at the top level rather than a true mainstay, and known to "
        "hold difficult endgames with accurate defense even when the "
        "isolated pawn becomes a genuine target.",
}

NOTABLE_SUBVARIATIONS = {
    "Queen's Gambit Declined: Albin Countergambit": {
        "overview": (
            "The Albin Countergambit answers 1.d4 d5 2.c4 with 2...e5!?, a "
            "genuine countergambit that gives back the c4-pawn's tension in "
            "exchange for an advanced, cramping pawn on d4 and quick piece "
            "activity. It's a sharp, provocative jab compared to the solid "
            "Queen's Gambit Declined lines around it, aiming to seize the "
            "initiative immediately rather than accept a slightly passive "
            "structure."
        ),
        "reputationNotes": (
            "Considered playable but objectively a little worse for Black "
            "with best defense, and rarely seen in serious grandmaster "
            "practice — though it has drawn occasional attention from "
            "strong attacking players such as Alexander Morozevich. It's "
            "best known for the Lasker Trap, a celebrated underpromotion "
            "tactic that has caught out many underprepared opponents, "
            "giving it a real reputation as a dangerous surprise weapon "
            "below the top level."
        ),
        "ratingBand": 2,
        "healthAtHigherLevels": -1,
        "style": {
            "tacticalVsPositional": 2,
            "riskTolerance": 2,
            "dynamicVsStatic": 1,
            "forgivingVsPunishing": 1,
        },
    },
    "Blackmar-Diemer Gambit Accepted: Ryder Gambit": {
        "overview": (
            "The Ryder Gambit pushes the Blackmar-Diemer's attacking "
            "philosophy to its extreme: instead of recapturing the f3-pawn "
            "with the knight, White plays 5.Qxf3, willingly sacrificing "
            "further material purely for attacking chances against Black's "
            "king. It's among the most materially reckless, forcing tries "
            "available from 1.d4 — living or dying on split-second "
            "tactical accuracy rather than any lasting positional "
            "compensation."
        ),
        "reputationNotes": (
            "Seen as the BDG's most extreme, all-or-nothing branch even by "
            "the gambit's own devotees — a razor's-edge weapon that scores "
            "well in blitz and against unprepared opposition but is "
            "considered objectively unsound against accurate defense. Best "
            "understood as a practical curiosity and surprise weapon rather "
            "than a serious try above club level."
        ),
        "healthAtHigherLevels": -2,
        "depthOfTheory": "Deep",
        "style": {
            "tacticalVsPositional": 2,
            "riskTolerance": 2,
            "dynamicVsStatic": 2,
            "forgivingVsPunishing": 2,
        },
    },
    "Semi-Slav Defense: Botvinnik Variation": {
        "overview": (
            "The Botvinnik Variation arises when Black grabs the c4-pawn "
            "against 5.Bg5 and White answers with the thematic 6.e4, "
            "launching one of the most forcing, deeply analyzed battles in "
            "all of chess. A long, largely forced sequence of pawn and "
            "piece sacrifices (...b5, e5, h6, g5, Nxg5, and beyond) leads to "
            "wild material and structural imbalances that essentially have "
            "to be memorized rather than worked out fresh at the board."
        ),
        "reputationNotes": (
            "Famous as one of the single most complex, theory-dense systems "
            "in chess, with well-trodden analysis running past move thirty "
            "in some lines. Despite — or because of — that reputation it "
            "remains a fully current top-level weapon (Alexei Shirov has "
            "been a leading practitioner), but it is widely considered "
            "unsuitable for anyone unwilling to memorize concrete forced "
            "sequences to a very deep level."
        ),
        "ratingBand": 5,
        "healthAtHigherLevels": 2,
        "depthOfTheory": "Deep",
        "estimatedHoursToCompetency": 150,
        "style": {
            "tacticalVsPositional": 2,
            "riskTolerance": 2,
            "dynamicVsStatic": 2,
            "forgivingVsPunishing": -2,
        },
    },
}
