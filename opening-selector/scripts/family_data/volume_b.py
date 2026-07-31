"""ECO volume B family data — wayfinder/tickets/0007-rescore-volume-b.md.
Owned exclusively by this file: no other volume file edits these keys,
so parallel work across volumes never conflicts here.
"""

FAMILY_TAGS = {
    "Alekhine Defense": ("Black", 1, 1, 2, 0, 0, 3, 2),
    "Barnes Defense": ("Black", 0, 1, 0, 1, -2, 1, 1),
    "Caro-Kann Defense": ("Black", -1, -2, -2, -1, 2, 2, 2),
    "Carr Defense": ("Black", 0, 0, 0, -1, -2, 1, 1),
    "Czech Defense": ("Black", -1, -1, -1, -1, 0, 2, 2),
    # Corrected from ("White", ...): Duras Gambit is Black's 1...f5 reply to
    # 1.e4, not a White opening — confirmed against the King's Pawn Game
    # research cache, which describes it as a Black pawn sacrifice.
    "Duras Gambit": ("Black", 1, 1, 1, 1, -2, 1, 1),
    "Fried Fox Defense": ("Black", 0, 2, 1, 2, -2, 1, 1),
    "Goldsmith Defense": ("Black", 0, 1, 0, -1, -2, 1, 1),
    "Hippopotamus Defense": ("Black", -1, -1, -1, -1, 0, 3, 1),
    "King's Pawn Game": ("White", 0, 0, 0, 0, 1, 1, 1),
    "Lemming Defense": ("Black", 0, 0, 0, -1, -2, 1, 1),
    "Lion Defense": ("Black", 0, 0, 0, 0, -1, 2, 2),
    "Nimzowitsch Defense": ("Black", 0, 0, 1, -1, -1, 2, 2),
    "Owen Defense": ("Black", 0, 1, 0, 1, -1, 2, 1),
    "Pirc Defense": ("Black", 1, 0, 1, 1, 0, 3, 2),
    "Scandinavian Defense": ("Black", 0, -1, -1, -1, 0, 2, 2),
    "Sicilian Defense": ("Black", 2, 2, 2, 2, 2, 4, 3),
    "St. George Defense": ("Black", 0, 1, 0, -1, -1, 1, 1),
    "Ware Defense": ("Black", 0, 0, 0, -1, -2, 1, 1),
}

FAMILY_OVERVIEW = {
    "Alekhine Defense": (
        "Alekhine's Defense provokes White into building a big pawn center "
        "with tempo-gaining attacks on the wandering black knight, then aims "
        "to undermine that center later with pieces and timely pawn breaks "
        "— a textbook hypermodern strategy named for Alexander Alekhine, "
        "who unveiled it in 1921. White's space and development lead are "
        "real, but the center can become a long-term target, so the "
        "position stays dynamic and double-edged rather than settling into "
        "a quiet, balanced structure. Sharp tries such as the Four Pawns "
        "Attack test whether Black can strike back before being overrun, "
        "while the quieter Exchange and Modern Variations offer White a "
        "smaller but more durable edge."
    ),
    "Barnes Defense": (
        "The Barnes Defense meets 1.e4 with the highly committal 1...f6, "
        "permanently denying Black's own knight the f6-square and loosening "
        "the long diagonal and the dark squares around Black's king. It is "
        "named for English amateur Thomas Wilson Barnes, whose one "
        "celebrated win with it — against Paul Morphy in 1858 — is really "
        "the opening's whole claim to fame rather than evidence that it is "
        "sound."
    ),
    "Caro-Kann Defense": (
        "The Caro-Kann meets 1.e4 with 1...c6, preparing to challenge the "
        "center with ...d5 while, unlike the French Defense, keeping the "
        "light-squared bishop free to develop outside the pawn chain before "
        "the structure locks up. Play typically continues 2.d4 d5, after "
        "which White chooses between the main 3.Nc3/3.Nd2 lines, the "
        "space-grabbing 3.e5 Advance Variation, or the simplifying 3.exd5 "
        "Exchange Variation. It is one of the most solid and reliable "
        "answers to 1.e4, trading a small loss of time for a resilient "
        "structure with few lasting weaknesses."
    ),
    "Carr Defense": (
        "The Carr Defense answers 1.e4 with the modest 1...h6, a flexible "
        "waiting move that slightly loosens the kingside and often simply "
        "transposes into a Borg Defense setup after a later ...g5. It has "
        "no real independent theory and mainly serves players who would "
        "rather see White commit first before choosing a plan."
    ),
    "Czech Defense": (
        "The Czech Defense (also called the Pribyl System) is a flexible "
        "relative of the Pirc Defense in which Black delays committing the "
        "kingside bishop, instead supporting a later ...d5 or ...e5 push "
        "with the solid ...c6. It keeps options open — Black can still "
        "fianchetto with ...g6 to transpose into a genuine Pirc, or expand "
        "more slowly on the queenside with ...Qc7 and ...b5 — trading some "
        "of the Pirc's sharper counterplay for extra solidity."
    ),
    "Duras Gambit": (
        "The Duras Gambit answers 1.e4 with the immediate pawn sacrifice "
        "1...f5!?, aiming to meet 2.exf5 with 2...Nf6 and regain the pawn "
        "with a lead in development. Unlike more established gambits, "
        "Black's compensation is thin: the position opens up faster for "
        "White too, and the weakening of Black's own kingside dark squares "
        "outweighs the extra tempo gained."
    ),
    "Fried Fox Defense": (
        "The Fried Fox Defense compounds an already-weakening 1...f6 with "
        "the startling 2...Kf7!?, giving up castling rights on only the "
        "second move to shore up the e6-square. It flouts two of the "
        "opening's most basic principles at once — center control and king "
        "safety — and exists mainly to shock an unprepared opponent rather "
        "than to hold up under real scrutiny."
    ),
    "Goldsmith Defense": (
        "The Goldsmith Defense (also known as the Pickering Defense) "
        "answers 1.e4 with the eccentric 1...h5, a rook-pawn advance that "
        "grabs no central space and further weakens the dark squares "
        "around Black's own king — essentially a mirror image of White's "
        "dubious Kadas Opening (1.h4)."
    ),
    "Hippopotamus Defense": (
        "The Hippopotamus is not a single move but a whole system: Black "
        "fianchettoes both bishops to b7 and g7, builds a modest pawn wall "
        "on the third rank (a6, b6, d6, e6, h6), and posts knights on d7 "
        "and e7, staying deliberately flexible about central commitments "
        "and king safety until White reveals more of their plan. It trades "
        "immediate central activity for a resilient, hard-to-attack "
        "structure and genuine anti-theoretical value, since there is "
        "little forced, memorizable theory to prepare against it."
    ),
    "King's Pawn Game": (
        "King's Pawn Game is the catch-all label for 1.e4 positions that "
        "have not yet settled into one of the many well-known named "
        "replies — it is simply the starting point from which the "
        "Sicilian, French, Caro-Kann, Ruy Lopez, and dozens of other "
        "openings all branch. As a first move in isolation it says little "
        "about style beyond White's intent to fight for the center and "
        "open lines for the kingside pieces quickly."
    ),
    "Lemming Defense": (
        "The Lemming Defense answers 1.e4 with 1...Na6, developing the "
        "queen's knight to one of its least useful squares rather than the "
        "natural c6 or d7. The move creates no concrete weakness so much "
        "as simply wastes time and gives the knight no clear future, "
        "making it hard to justify against accurate play."
    ),
    "Lion Defense": (
        "The Lion Defense is a Hanham-style relative of the Philidor "
        "Defense (typically 1.e4 d6 2.d4 Nf6 3.Nc3 Nbd7, followed by "
        "...e5) in which Black keeps the center solid with pawns on d6 and "
        "e5 while holding back the light-squared bishop and rook pawns, "
        "planning a later kingside pawn storm with ...g5 rather than quiet "
        "consolidation. It was popularized in club circles by Dutch "
        "amateurs Jerry van Rekom and Leo Jansen and has since been "
        "written up as the 'Black Lion,' an aggressive spin on the "
        "traditionally passive Hanham Philidor."
    ),
    "Nimzowitsch Defense": (
        "The Nimzowitsch Defense answers 1.e4 with 1...Nc6, a hypermodern "
        "try named for Aron Nimzowitsch in which Black invites White to "
        "build a full pawn center and only then works to restrain or "
        "undermine it, typically continuing with an early ...d5 or ...e5. "
        "It can lead to genuinely independent structures, though White's "
        "simple 2.Nf3 often allows a transposition back into an ordinary "
        "Open Game if Black plays 2...e5."
    ),
    "Owen Defense": (
        "Owen's Defense meets 1.e4 with 1...b6, fianchettoing the queen's "
        "bishop to b7 to eye e4 and the long diagonal from a distance "
        "rather than contesting the center with a pawn. The tradeoff is "
        "real: White is left free to build a full pawn center and can "
        "gain genuine space before Black's plan of ...Bb7, ...e6, and "
        "kingside development ever gets moving."
    ),
    "Pirc Defense": (
        "The Pirc Defense (1.e4 d6 2.d4 Nf6 3.Nc3 g6) is a hypermodern "
        "system in which Black allows White a full classical pawn center "
        "in exchange for rapid, flexible development and a fianchettoed "
        "king's bishop aimed at that center. It shares its core ideas and "
        "move order with the King's Indian Defense a tempo behind, and "
        "White's sharpest try, the Austrian Attack (4.f4), turns the "
        "position into a genuine race between White's central and "
        "kingside expansion and Black's counterplay against d4 and e5."
    ),
    "Scandinavian Defense": (
        "The Scandinavian Defense (or Center Counter, 1.e4 d5) strikes at "
        "White's e-pawn immediately, forcing matters in the center on move "
        "one; after 2.exd5, Black chooses between recapturing at once with "
        "2...Qxd5 (accepting an early loss of time when White plays "
        "3.Nc3) or the Modern Scandinavian, 2...Nf6, which delays the "
        "recapture to avoid that tempo loss altogether. It is one of the "
        "oldest documented openings in chess, appearing in a 15th-century "
        "poem describing a game with the modern queen and bishop moves."
    ),
    "Sicilian Defense": (
        "The Sicilian Defense (1.e4 c5) is Black's most popular and most "
        "fought-over answer to 1.e4, immediately breaking symmetry to "
        "fight for d4 and grab queenside space at the cost of a little "
        "development time. Play is characteristically sharp and "
        "unbalanced from the very first moves — after the typical 2.Nf3 "
        "and 3.d4 cxd4 4.Nxd4, the game usually heads into one of dozens "
        "of deeply analyzed structures rather than a quiet equal position, "
        "making it Black's best practical try for a full-blooded fight "
        "rather than a draw."
    ),
    "St. George Defense": (
        "The St. George Defense answers 1.e4 with the modest-looking "
        "1...a6, a flank move that prepares queenside expansion with "
        "...b5 while conceding White a free hand in the center. It is "
        "closely associated with English IM Michael Basman, who did much "
        "of its theoretical groundwork, and can transpose into hybrid "
        "French- or Ruy-Lopez-flavored structures depending on Black's "
        "follow-up."
    ),
    "Ware Defense": (
        "The Ware Defense (also called the Corn Stalk Defense) answers "
        "1.e4 with the eccentric flank move 1...a5, gaining no central "
        "foothold and developing nothing but a rook pawn. It is named "
        "after 19th-century American master Preston Ware, who tried it "
        "repeatedly in tournament play with only modest results."
    ),
}

FAMILY_REPUTATION = {
    "Alekhine Defense": (
        "Historically championed by Bobby Fischer and Viktor Korchnoi, and "
        "still occasionally wheeled out by elite players like Magnus "
        "Carlsen and Vassily Ivanchuk, it has a respectable pedigree "
        "without ever becoming mainstream — most top players treat it as "
        "a well-founded surprise weapon rather than a primary defense."
    ),
    "Barnes Defense": (
        "Virtually every serious source treats it as clearly inferior, "
        "since it does nothing to fight for the center and leaves lasting "
        "kingside weaknesses that a competent opponent can target "
        "quickly; it survives only as a historical curiosity and "
        "occasional blitz try."
    ),
    "Caro-Kann Defense": (
        "Long known as a slightly passive but rock-solid choice, it has "
        "been rehabilitated as a fully fashionable top-level weapon in "
        "the hands of players such as Alireza Firouzja and Ding Liren, "
        "and remains an excellent, low-maintenance choice at club level "
        "too."
    ),
    "Carr Defense": (
        "It is not considered a serious defense at any competitive level, "
        "though it has been tried occasionally by inventive players such "
        "as Michael Basman and even Magnus Carlsen in offbeat games; it "
        "survives as a curiosity rather than a repertoire choice."
    ),
    "Czech Defense": (
        "It has a reputation as a sound, low-risk choice for players who "
        "like Pirc/Modern structures but want to avoid the heaviest main "
        "lines; it is seen regularly at club level and only occasionally "
        "in top-flight play."
    ),
    "Duras Gambit": (
        "It is essentially a historical footnote — associated with a "
        "handful of exhibition games between Ossip Bernstein and Oldřich "
        "Duras — and is not considered objectively sound at any serious "
        "level of play."
    ),
    "Fried Fox Defense": (
        "It is treated by essentially every source as a novelty or joke "
        "opening rather than a serious try, since a well-prepared "
        "opponent can often exploit the exposed king with direct, forcing "
        "play."
    ),
    "Goldsmith Defense": (
        "It has no real theoretical backing and is treated as an oddity "
        "rather than a playable system, chiefly of interest to fans of "
        "unorthodox openings looking for a surprise weapon in casual or "
        "blitz games."
    ),
    "Hippopotamus Defense": (
        "Best known from Boris Spassky's use of it twice against Tigran "
        "Petrosian in their 1966 world championship match, it has since "
        "been adopted as an occasional surprise weapon even by elite "
        "players like Magnus Carlsen and Hikaru Nakamura, prized more for "
        "its practical, anti-preparation value than for any objective "
        "advantage."
    ),
    "King's Pawn Game": (
        "As the single most popular opening move in chess — memorably "
        "endorsed by Bobby Fischer's '1.e4! I win' — it enjoys the "
        "highest possible practical reputation at every level of play; "
        "any specific verdict really belongs to whichever named opening "
        "the game transposes into."
    ),
    "Lemming Defense": (
        "It is a minor unorthodox-openings curiosity with no real "
        "practical following, and is essentially never seen outside of "
        "players deliberately experimenting with offbeat first moves."
    ),
    "Lion Defense": (
        "It functions mainly as a practical club-level weapon prized for "
        "flexibility and surprise value rather than as a top-level main "
        "line, since its delayed development and committal kingside "
        "expansion plan can be a genuine liability against precise, "
        "well-prepared opposition."
    ),
    "Nimzowitsch Defense": (
        "Garry Kasparov and Raymond Keene summed it up well: never fully "
        "accepted as a dependable main opening, but sound enough to "
        "reward a maverick willing to play less-charted positions — it "
        "remains a fringe but perfectly respectable choice, championed at "
        "grandmaster level mainly by players like Tony Miles."
    ),
    "Owen Defense": (
        "It carries a fairly dubious reputation among theoreticians — "
        "well-prepared opponents are considered able to prove an edge — "
        "but it has attracted enough occasional grandmaster attention "
        "(from Bent Larsen and Michael Basman's 1970s revival through "
        "modern dabblers like Christian Bauer and Magnus Carlsen in "
        "blitz) that it is treated as a viable surprise weapon rather "
        "than a refuted line."
    ),
    "Pirc Defense": (
        "Garry Kasparov once dismissed it as barely worth using at the "
        "highest level, arguing it hands White too many good options, and "
        "it is true that it demands precise handling against the "
        "sharpest lines; nonetheless it remains a perfectly sound, "
        "popular choice from club level up through world-class "
        "grandmasters looking for a flexible, less-mainstream 1.e4 "
        "defense."
    ),
    "Scandinavian Defense": (
        "Long treated as a slightly passive, second-tier option next to "
        "the French or Caro-Kann, it has been steadily rehabilitated "
        "since Bent Larsen's win over Anatoly Karpov in 1979 and now "
        "enjoys genuine elite respectability — Magnus Carlsen in "
        "particular has used it repeatedly to beat and draw top-level "
        "opposition, including at classical and blitz world championship "
        "level."
    ),
    "Sicilian Defense": (
        "Once viewed with suspicion — even Paul Morphy criticized it and "
        "it barely appeared in top tournaments around 1900 — it was "
        "revived by Botvinnik, Boleslavsky, and Najdorf and then propelled "
        "to the very top by Bobby Fischer and Garry Kasparov, who both "
        "used it as a near-exclusive main weapon; it remains the most "
        "played and most heavily analyzed opening at both club and "
        "world-championship level."
    ),
    "St. George Defense": (
        "Its single moment of real fame is Tony Miles's win over reigning "
        "world champion Anatoly Karpov with it in 1980 (hence its "
        "alternate name, the Birmingham Defense), but that result is very "
        "much the exception rather than the rule — objectively it is "
        "regarded as a dubious try that concedes too much central space "
        "to be a sound main-line choice."
    ),
    "Ware Defense": (
        "It has no real theoretical standing and is regarded purely as a "
        "historical curiosity; its chief practical flaw, per period "
        "commentary, is spending an early move on a peripheral pawn "
        "advance rather than fighting for the center."
    ),
}

NOTABLE_SUBVARIATIONS = {
    "Sicilian Defense: Najdorf Variation": {
        "overview": (
            "The Najdorf is the most studied and arguably most prestigious "
            "branch of the entire Sicilian complex: 5...a6 is a subtle, "
            "flexible move that rules out Bb5+ checks and keeps every "
            "option open — ...e5, ...e6, a fianchetto, queenside expansion "
            "with ...b5 — before Black commits to a specific structure. "
            "Both sides typically play for a full-blooded fight with "
            "chances to attack on opposite wings, making it the "
            "definitive vehicle for players who want maximal winning "
            "chances with either color."
        ),
        "reputationNotes": (
            "Made famous above all by Bobby Fischer and Garry Kasparov, "
            "who both used it as a primary weapon for most of their "
            "careers, it remains the single deepest-theory main line in "
            "the entire Sicilian Defense — a lifetime study for those who "
            "take it up seriously, and a line where memorized preparation "
            "matters enormously even at club level."
        ),
        "ratingBand": 5,
        "healthAtHigherLevels": 2,
    },
    "Sicilian Defense: Dragon Variation": {
        "overview": (
            "The Dragon fianchettoes Black's king bishop to g7 for maximum "
            "pressure down the long diagonal, and in the critical "
            "Yugoslav Attack both sides typically castle on opposite "
            "wings and race pawn storms at each other's kings — arguably "
            "the single sharpest, most mutually committal structure the "
            "whole Sicilian complex produces. A single tempo lost on "
            "either side can be fatal, which is what gives the variation "
            "its fearsome reputation."
        ),
        "reputationNotes": (
            "Popularized by Mikhail Botvinnik and later a lifelong "
            "favorite of Bobby Fischer, it is respected at every level "
            "from club to world championship, though its razor-sharp "
            "forcing lines mean it rewards — and punishes the lack of — "
            "precise home preparation more than almost any other Sicilian "
            "branch."
        ),
        "ratingBand": 5,
        "healthAtHigherLevels": 2,
    },
    "Sicilian Defense: Sveshnikov System": {
        "overview": (
            "The Sveshnikov meets the Open Sicilian with the committal "
            "4...Nf6 5.Nc3 e5, voluntarily creating a backward d-pawn and "
            "a hole on d5 in exchange for immediate central space and "
            "free piece play — a dynamic, structurally unbalanced line "
            "rather than a purely tactical slugfest. Black accepts a "
            "permanent positional concession as the price of active, "
            "well-coordinated pieces and good practical chances."
        ),
        "reputationNotes": (
            "Once considered dubious because of that weak d5-square, it "
            "was rehabilitated through deep analysis in the 1970s-80s "
            "(lending the line its name) and is now a fully mainstream "
            "elite weapon, played with confidence by numerous "
            "world-class grandmasters who trust the piece activity to "
            "outweigh the structural weakness."
        ),
    },
    "Sicilian Defense: Alapin Variation": {
        "overview": (
            "The Alapin is White's most respected anti-Sicilian try, "
            "sidestepping the sprawling Open Sicilian theory entirely by "
            "preparing 3.d4 with an extra tempo and a healthy center "
            "rather than committing a knight to d4 right away. It shifts "
            "the whole complexion of the game away from the Sicilian's "
            "usual dynamism toward a calmer, more classical center-based "
            "struggle, closer in feel to the Caro-Kann or French than to "
            "the sharp Najdorf or Dragon."
        ),
        "reputationNotes": (
            "It has a long-standing reputation as a safe, low-theory "
            "practical weapon for White — popular at club level for "
            "avoiding memorized Open Sicilian preparation — while "
            "remaining perfectly respectable and occasionally seen at "
            "grandmaster level too."
        ),
        "ratingBand": 2,
        "healthAtHigherLevels": 1,
    },
    "Caro-Kann Defense: Panov Attack": {
        "overview": (
            "The Panov-Botvinnik Attack breaks sharply from the "
            "Caro-Kann's usual solid character: by meeting the recapture "
            "on d5 with 4.c4, White steers into an isolated-queen's-pawn "
            "structure with faster development and open lines, more "
            "reminiscent of a Queen's Gambit IQP battle than a typical "
            "Caro-Kann. White typically gets rapid piece activity and "
            "kingside attacking chances in exchange for the long-term "
            "structural weakness of the isolated d-pawn, making the "
            "position considerably more dynamic and double-edged than the "
            "family's usual static, low-risk lines."
        ),
        "reputationNotes": (
            "Named for Vasily Panov and world champion Mikhail Botvinnik, "
            "it is a well-respected, actively played try that gives "
            "Caro-Kann players a real fight rather than a quiet game, and "
            "demands that Black know genuine theory rather than rely on "
            "general solid-opening instincts."
        ),
        "ratingBand": 3,
    },
    "Scandinavian Defense: Portuguese Gambit": {
        "overview": (
            "The Portuguese Gambit departs sharply from the Scandinavian's "
            "usual solid character: instead of recapturing the pawn right "
            "away, Black pins White's future knight with 3...Bg4, "
            "offering active piece play and quick development in exchange "
            "for staying a pawn down for several moves. It produces "
            "sharp, double-edged positions closer in spirit to the "
            "Icelandic Gambit than to the calmer main-line Scandinavian, "
            "and requires precise follow-up since the compensation is "
            "real but not automatic."
        ),
        "reputationNotes": (
            "It is treated as a fully legitimate, actively analyzed try "
            "rather than a dubious sideline, popular among Scandinavian "
            "players looking to unbalance the game and avoid the main "
            "line's reputation for solidity bordering on passivity — "
            "though well-prepared opponents have concrete refutations to "
            "look out for."
        ),
        "ratingBand": 3,
    },
}
