/**
 * PairingService
 * Handles the pairing algorithm with constraints
 */
class PairingService {
  /**
   * Check if two players satisfy the recent opponent constraint
   * Players should not have played in the last X rounds
   * @param {Tournament} tournament - The tournament
   * @param {Player} playerA - First player
   * @param {Player} playerB - Second player
   * @returns {boolean} True if constraint is satisfied
   */
  checkRecentOpponentConstraint(tournament, playerA, playerB) {
    const aMatches = tournament.getPlayerMatches(playerA.id);
    const recentMatches = aMatches.slice(-tournament.settings.constraintX);

    for (const match of recentMatches) {
      const opponentId = match.whitePlayerId === playerA.id ?
        match.blackPlayerId : match.whitePlayerId;
      if (opponentId === playerB.id) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if two players satisfy the point difference constraint
   * Player B should not have more than Y points more than player A
   * @param {Tournament} tournament - The tournament
   * @param {Player} playerA - First player (lower ranked)
   * @param {Player} playerB - Second player (candidate opponent)
   * @returns {boolean} True if constraint is satisfied
   */
  checkPointDifferenceConstraint(tournament, playerA, playerB) {
    const scoreA = tournament.calculatePlayerScore(playerA.id);
    const scoreB = tournament.calculatePlayerScore(playerB.id);
    const difference = Math.abs(scoreB - scoreA);
    return difference <= tournament.settings.constraintY;
  }

  /**
   * Check if two players are from the same class (soft constraint)
   * @param {Player} playerA - First player
   * @param {Player} playerB - Second player
   * @returns {boolean} True if different classes or no class specified
   */
  checkClassConstraint(playerA, playerB) {
    if (!playerA.klas || !playerB.klas) return true;
    return playerA.klas !== playerB.klas;
  }

  /**
   * Get all players available for pairing
   * Excludes absent players and players in active matches
   * @param {Tournament} tournament - The tournament
   * @returns {Player[]} Available players
   */
  getAvailablePlayers(tournament) {
    return tournament.players.filter(p => {
      if (p.afwezig) return false;
      const hasActiveMatch = tournament.matches.some(m =>
        m.isActive() && (m.whitePlayerId === p.id || m.blackPlayerId === p.id)
      );
      return !hasActiveMatch;
    });
  }

  /**
   * Sort players by score (ascending - lowest first)
   * @param {Tournament} tournament - The tournament
   * @param {Player[]} players - Players to sort
   * @returns {Player[]} Sorted players
   */
  sortPlayersByScore(tournament, players) {
    return [...players].sort((a, b) => {
      const scoreA = tournament.calculatePlayerScore(a.id);
      const scoreB = tournament.calculatePlayerScore(b.id);
      return scoreA - scoreB;
    });
  }

  /**
   * Find the best opponent for a player
   * Applies all constraints with fallback logic
   * @param {Tournament} tournament - The tournament
   * @param {Player} player - The player to find opponent for
   * @param {Player[]} availablePlayers - Pool of available players
   * @returns {Player|null} Best opponent or null if none found
   */
  findBestOpponent(tournament, player, availablePlayers) {
    const sortedCandidates = this.sortPlayersByScore(tournament,
      availablePlayers.filter(p => p.id !== player.id)
    );

    // Try with all constraints
    for (const candidate of sortedCandidates) {
      if (!this.checkRecentOpponentConstraint(tournament, player, candidate)) continue;
      if (!this.checkPointDifferenceConstraint(tournament, player, candidate)) continue;
      if (tournament.settings.avoidSameClass &&
          !this.checkClassConstraint(player, candidate)) continue;
      return candidate;
    }

    // Fallback: without class constraint
    if (tournament.settings.avoidSameClass) {
      for (const candidate of sortedCandidates) {
        if (!this.checkRecentOpponentConstraint(tournament, player, candidate)) continue;
        if (!this.checkPointDifferenceConstraint(tournament, player, candidate)) continue;
        return candidate;
      }
    }

    // Last resort: only recent opponent constraint
    for (const candidate of sortedCandidates) {
      if (!this.checkRecentOpponentConstraint(tournament, player, candidate)) continue;
      return candidate;
    }

    return null;
  }

  /**
   * Determine which player should play white
   * Based on color preference to balance white/black games
   * @param {Tournament} tournament - The tournament
   * @param {Player} playerA - First player
   * @param {Player} playerB - Second player
   * @returns {Object} { white: Player, black: Player }
   */
  determineColors(tournament, playerA, playerB) {
    const prefA = tournament.calculatePlayerColourPreference(playerA.id);
    const prefB = tournament.calculatePlayerColourPreference(playerB.id);

    // Priority: should_be > prefers > neutral
    if (prefA === 'should_be_white') return { white: playerA, black: playerB };
    if (prefA === 'should_be_black') return { white: playerB, black: playerA };
    if (prefB === 'should_be_white') return { white: playerB, black: playerA };
    if (prefB === 'should_be_black') return { white: playerA, black: playerB };
    if (prefA === 'prefers_white') return { white: playerA, black: playerB };
    if (prefA === 'prefers_black') return { white: playerB, black: playerA };
    if (prefB === 'prefers_white') return { white: playerB, black: playerA };
    if (prefB === 'prefers_black') return { white: playerA, black: playerB };

    // Both neutral: lower score gets white
    const scoreA = tournament.calculatePlayerScore(playerA.id);
    const scoreB = tournament.calculatePlayerScore(playerB.id);
    return scoreA <= scoreB ?
      { white: playerA, black: playerB } :
      { white: playerB, black: playerA };
  }

  /**
   * Create automatic pairings for available players
   * @param {Tournament} tournament - The tournament
   * @param {number[]} selectedPlayerIds - Optional: specific player IDs to pair (empty = all available)
   * @returns {Match[]} Array of created matches
   */
  createAutomaticPairings(tournament, selectedPlayerIds = []) {
    const available = selectedPlayerIds.length > 0
      ? this.getAvailablePlayers(tournament).filter(p => selectedPlayerIds.includes(p.id))
      : this.getAvailablePlayers(tournament);

    if (available.length < 2) {
      return [];
    }

    const sorted = this.sortPlayersByScore(tournament, available);
    const paired = new Set();
    const pairings = [];
    const batchId = 'batch_' + Date.now();
    const currentRound = tournament.getCurrentRound();

    for (const player of sorted) {
      if (paired.has(player.id)) continue;

      const opponent = this.findBestOpponent(tournament, player,
        available.filter(p => !paired.has(p.id))
      );

      if (opponent) {
        const colors = this.determineColors(tournament, player, opponent);
        const match = tournament.addMatch(colors.white.id, colors.black.id, currentRound);
        match.batchId = batchId;
        pairings.push(match);
        paired.add(player.id);
        paired.add(opponent.id);
      }
    }

    return pairings;
  }

  /**
   * Create manual pairing (ignores constraints X and Y, but applies color logic)
   * @param {Tournament} tournament - The tournament
   * @param {number} player1Id - First player ID
   * @param {number} player2Id - Second player ID
   * @returns {Match|null} Created match or null if players not available
   */
  createManualPairing(tournament, player1Id, player2Id) {
    const available = this.getAvailablePlayers(tournament);
    const player1 = available.find(p => p.id === player1Id);
    const player2 = available.find(p => p.id === player2Id);

    if (!player1 || !player2) return null;

    const colors = this.determineColors(tournament, player1, player2);
    const currentRound = tournament.getCurrentRound();
    const match = tournament.addMatch(colors.white.id, colors.black.id, currentRound);
    match.batchId = 'manual_' + Date.now();

    return match;
  }
}

