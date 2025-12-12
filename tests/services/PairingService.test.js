/**
 * Unit tests for PairingService
 * This is the core pairing algorithm with constraints
 */

// Mock classes (same as before)
class Player {
  constructor(id, voornaam, naam, klas = '') {
    this.id = id;
    this.voornaam = voornaam;
    this.naam = naam;
    this.klas = klas;
    this.afwezig = false;
  }
}

class Match {
  constructor(id, whitePlayerId, blackPlayerId, round) {
    this.id = id;
    this.whitePlayerId = whitePlayerId;
    this.blackPlayerId = blackPlayerId;
    this.round = round;
    this.result = null;
  }
  isActive() { return this.result === null; }
  isFinished() { return this.result !== null; }
}

// Helper function to create Match with result
function createMatchWithResult(id, whitePlayerId, blackPlayerId, round, result) {
  const match = new Match(id, whitePlayerId, blackPlayerId, round);
  match.result = result;
  return match;
}

class Tournament {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.players = [];
    this.matches = [];
    this.settings = {
      constraintX: 3,
      constraintY: 3,
      avoidSameClass: false
    };
  }
  getPlayerMatches(playerId) {
    return this.matches.filter(m =>
      m.whitePlayerId === playerId || m.blackPlayerId === playerId
    );
  }
  calculatePlayerScore(playerId) {
    let score = 0;
    for (const match of this.matches) {
      if (!match.isFinished()) continue;
      if (match.whitePlayerId === playerId) {
        score += (match.result === '1-0' ? 1 : match.result === '1/2-1/2' ? 0.5 : 0);
      } else if (match.blackPlayerId === playerId) {
        score += (match.result === '0-1' ? 1 : match.result === '1/2-1/2' ? 0.5 : 0);
      }
    }
    return score;
  }
  calculatePlayerColourPreference(playerId) {
    let whiteCount = 0;
    let blackCount = 0;
    for (const match of this.matches) {
      if (match.whitePlayerId === playerId) whiteCount++;
      if (match.blackPlayerId === playerId) blackCount++;
    }
    const diff = whiteCount - blackCount;
    if (diff >= 2) return 'should_be_black';
    if (diff <= -2) return 'should_be_white';
    if (diff === 1) return 'prefers_black';
    if (diff === -1) return 'prefers_white';
    return 'neutral';
  }
}

// Mock PairingService
class PairingService {
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

  checkPointDifferenceConstraint(tournament, playerA, playerB) {
    const scoreA = tournament.calculatePlayerScore(playerA.id);
    const scoreB = tournament.calculatePlayerScore(playerB.id);
    const difference = Math.abs(scoreB - scoreA);
    return difference <= tournament.settings.constraintY;
  }

  checkClassConstraint(playerA, playerB) {
    if (!playerA.klas || !playerB.klas) return true;
    return playerA.klas !== playerB.klas;
  }

  getAvailablePlayers(tournament) {
    return tournament.players.filter(p => {
      if (p.afwezig) return false;
      const hasActiveMatch = tournament.matches.some(m =>
        m.isActive() && (m.whitePlayerId === p.id || m.blackPlayerId === p.id)
      );
      return !hasActiveMatch;
    });
  }

  sortPlayersByScore(tournament, players) {
    return [...players].sort((a, b) => {
      const scoreA = tournament.calculatePlayerScore(a.id);
      const scoreB = tournament.calculatePlayerScore(b.id);
      return scoreA - scoreB; // lowest first
    });
  }

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

  determineColors(tournament, playerA, playerB) {
    const prefA = tournament.calculatePlayerColourPreference(playerA.id);
    const prefB = tournament.calculatePlayerColourPreference(playerB.id);

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
}

describe('PairingService', () => {
  let service;
  let tournament;

  beforeEach(() => {
    service = new PairingService();
    tournament = new Tournament(1, 'Test');
  });

  describe('checkRecentOpponentConstraint', () => {
    test('should return true for players who never played', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      tournament.players = [p1, p2];

      const result = service.checkRecentOpponentConstraint(tournament, p1, p2);

      expect(result).toBe(true);
    });

    test('should return false for recent opponents within X rounds', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      tournament.players = [p1, p2];
      tournament.settings.constraintX = 3;

      // They played 2 rounds ago
      const m1 = new Match(1, p1.id, p2.id, 1);
      m1.result = '1-0';
      tournament.matches = [m1];

      const result = service.checkRecentOpponentConstraint(tournament, p1, p2);

      expect(result).toBe(false);
    });

    test('should return true for opponents outside X rounds', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      const p3 = new Player(3, 'Tom', 'Wouters');
      const p4 = new Player(4, 'Lisa', 'Claes');
      tournament.players = [p1, p2, p3, p4];
      tournament.settings.constraintX = 2;

      // p1 played p2 3 rounds ago, then played p3 and p4
      tournament.matches = [
        createMatchWithResult(1, p1.id, p2.id, 1, '1-0'),
        createMatchWithResult(2, p1.id, p3.id, 2, '1-0'),
        createMatchWithResult(3, p1.id, p4.id, 3, '1-0')
      ];

      const result = service.checkRecentOpponentConstraint(tournament, p1, p2);

      expect(result).toBe(true);
    });

    test('should check last X rounds only', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      tournament.players = [p1, p2];
      tournament.settings.constraintX = 3;

      // 4 matches, they played in match 1 (4 rounds ago)
      tournament.matches = [
        createMatchWithResult(1, p1.id, p2.id, 1, '1-0'),
        createMatchWithResult(2, p1.id, 3, 2, '1-0'),
        createMatchWithResult(3, p1.id, 4, 3, '1-0'),
        createMatchWithResult(4, p1.id, 5, 4, '1-0')
      ];

      const result = service.checkRecentOpponentConstraint(tournament, p1, p2);

      expect(result).toBe(true);
    });
  });

  describe('checkPointDifferenceConstraint', () => {
    test('should return true for players with equal scores', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      tournament.players = [p1, p2];
      tournament.settings.constraintY = 3;

      const result = service.checkPointDifferenceConstraint(tournament, p1, p2);

      expect(result).toBe(true);
    });

    test('should return true for players within Y points', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      const p3 = new Player(3, 'Tom', 'Wouters');
      tournament.players = [p1, p2, p3];
      tournament.settings.constraintY = 3;

      // p2 has 2 points, p1 has 0
      const m1 = new Match(1, p2.id, p3.id, 1);
      m1.result = '1-0';
      const m2 = new Match(2, p2.id, p3.id, 2);
      m2.result = '1-0';
      tournament.matches = [m1, m2];

      const result = service.checkPointDifferenceConstraint(tournament, p1, p2);

      expect(result).toBe(true); // difference is 2, within 3
    });

    test('should return false for players beyond Y points', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      const p3 = new Player(3, 'Tom', 'Wouters');
      tournament.players = [p1, p2, p3];
      tournament.settings.constraintY = 2;

      // p2 has 3 points, p1 has 0
      const m1 = new Match(1, p2.id, p3.id, 1);
      m1.result = '1-0';
      const m2 = new Match(2, p2.id, p3.id, 2);
      m2.result = '1-0';
      const m3 = new Match(3, p2.id, p3.id, 3);
      m3.result = '1-0';
      tournament.matches = [m1, m2, m3];

      const result = service.checkPointDifferenceConstraint(tournament, p1, p2);

      expect(result).toBe(false); // difference is 3, beyond 2
    });

    test('should work with decimal scores', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      const p3 = new Player(3, 'Tom', 'Wouters');
      tournament.players = [p1, p2, p3];
      tournament.settings.constraintY = 1;

      // p1 has 1.5, p2 has 0.5
      const m1 = new Match(1, p1.id, p3.id, 1);
      m1.result = '1-0';
      const m2 = new Match(2, p1.id, p3.id, 2);
      m2.result = '1/2-1/2';
      const m3 = new Match(3, p2.id, p3.id, 1);
      m3.result = '1/2-1/2';
      tournament.matches = [m1, m2, m3];

      const result = service.checkPointDifferenceConstraint(tournament, p1, p2);

      expect(result).toBe(true); // difference is 1.0, at boundary and inclusive (1.0 <= 1.0)
    });
  });

  describe('checkClassConstraint', () => {
    test('should return false for same class', () => {
      const p1 = new Player(1, 'Jan', 'Peeters', '5A');
      const p2 = new Player(2, 'Marie', 'Janssens', '5A');

      const result = service.checkClassConstraint(p1, p2);

      expect(result).toBe(false);
    });

    test('should return true for different classes', () => {
      const p1 = new Player(1, 'Jan', 'Peeters', '5A');
      const p2 = new Player(2, 'Marie', 'Janssens', '5B');

      const result = service.checkClassConstraint(p1, p2);

      expect(result).toBe(true);
    });

    test('should return true if one player has no class', () => {
      const p1 = new Player(1, 'Jan', 'Peeters', '5A');
      const p2 = new Player(2, 'Marie', 'Janssens', '');

      const result = service.checkClassConstraint(p1, p2);

      expect(result).toBe(true);
    });

    test('should return true if both players have no class', () => {
      const p1 = new Player(1, 'Jan', 'Peeters', '');
      const p2 = new Player(2, 'Marie', 'Janssens', '');

      const result = service.checkClassConstraint(p1, p2);

      expect(result).toBe(true);
    });
  });

  describe('getAvailablePlayers', () => {
    test('should return all players for new tournament', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      tournament.players = [p1, p2];

      const available = service.getAvailablePlayers(tournament);

      expect(available).toHaveLength(2);
    });

    test('should exclude absent players', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      p2.afwezig = true;
      tournament.players = [p1, p2];

      const available = service.getAvailablePlayers(tournament);

      expect(available).toHaveLength(1);
      expect(available[0].id).toBe(p1.id);
    });

    test('should exclude players in active matches', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      const p3 = new Player(3, 'Tom', 'Wouters');
      tournament.players = [p1, p2, p3];
      tournament.matches = [new Match(1, p1.id, p2.id, 1)]; // active

      const available = service.getAvailablePlayers(tournament);

      expect(available).toHaveLength(1);
      expect(available[0].id).toBe(p3.id);
    });

    test('should include players from finished matches', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      tournament.players = [p1, p2];
      const match = new Match(1, p1.id, p2.id, 1);
      match.result = '1-0'; // finished
      tournament.matches = [match];

      const available = service.getAvailablePlayers(tournament);

      expect(available).toHaveLength(2);
    });
  });

  describe('sortPlayersByScore', () => {
    test('should sort players by score ascending', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      const p3 = new Player(3, 'Tom', 'Wouters');
      tournament.players = [p1, p2, p3];

      // p1: 0, p2: 2, p3: 1
      tournament.matches = [
        createMatchWithResult(1, p2.id, 99, 1, '1-0'),
        createMatchWithResult(2, p2.id, 99, 2, '1-0'),
        createMatchWithResult(3, p3.id, 99, 1, '1-0')
      ];

      const sorted = service.sortPlayersByScore(tournament, [p1, p2, p3]);

      expect(sorted[0].id).toBe(p1.id); // 0 points
      expect(sorted[1].id).toBe(p3.id); // 1 point
      expect(sorted[2].id).toBe(p2.id); // 2 points
    });

    test('should not mutate original array', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      tournament.players = [p1, p2];
      const original = [p2, p1];

      service.sortPlayersByScore(tournament, original);

      expect(original[0].id).toBe(p2.id); // unchanged
    });
  });

  describe('findBestOpponent', () => {
    test('should find opponent for player with no constraints', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      tournament.players = [p1, p2];
      tournament.settings.constraintX = 3;
      tournament.settings.constraintY = 3;

      const opponent = service.findBestOpponent(tournament, p1, [p1, p2]);

      expect(opponent).toBe(p2);
    });

    test('should not return player itself', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      tournament.players = [p1];

      const opponent = service.findBestOpponent(tournament, p1, [p1]);

      expect(opponent).toBeNull();
    });

    test('should skip recent opponents', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      const p3 = new Player(3, 'Tom', 'Wouters');
      tournament.players = [p1, p2, p3];
      tournament.settings.constraintX = 2;

      // p1 played p2 recently
      tournament.matches = [
        createMatchWithResult(1, p1.id, p2.id, 1, '1-0')
      ];

      const opponent = service.findBestOpponent(tournament, p1, [p1, p2, p3]);

      expect(opponent.id).toBe(p3.id); // skips p2
    });

    test('should skip opponents beyond point difference', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      const p3 = new Player(3, 'Tom', 'Wouters');
      tournament.players = [p1, p2, p3];
      tournament.settings.constraintY = 1;

      // p2 has 3 points, p3 has 0, p1 has 0
      tournament.matches = [
        createMatchWithResult(1, p2.id, 99, 1, '1-0'),
        createMatchWithResult(2, p2.id, 99, 2, '1-0'),
        createMatchWithResult(3, p2.id, 99, 3, '1-0')
      ];

      const opponent = service.findBestOpponent(tournament, p1, [p1, p2, p3]);

      expect(opponent.id).toBe(p3.id); // skips p2 (too many points)
    });

    test('should respect class constraint when enabled', () => {
      const p1 = new Player(1, 'Jan', 'Peeters', '5A');
      const p2 = new Player(2, 'Marie', 'Janssens', '5A');
      const p3 = new Player(3, 'Tom', 'Wouters', '5B');
      tournament.players = [p1, p2, p3];
      tournament.settings.avoidSameClass = true;

      const opponent = service.findBestOpponent(tournament, p1, [p1, p2, p3]);

      expect(opponent.id).toBe(p3.id); // skips p2 (same class)
    });

    test('should fallback to same class if no other option', () => {
      const p1 = new Player(1, 'Jan', 'Peeters', '5A');
      const p2 = new Player(2, 'Marie', 'Janssens', '5A');
      tournament.players = [p1, p2];
      tournament.settings.avoidSameClass = true;

      const opponent = service.findBestOpponent(tournament, p1, [p1, p2]);

      expect(opponent.id).toBe(p2.id); // accepts same class as fallback
    });

    test('should return null when no valid opponent', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      tournament.players = [p1, p2];
      tournament.settings.constraintX = 1;

      // They just played
      tournament.matches = [
        createMatchWithResult(1, p1.id, p2.id, 1, '1-0')
      ];

      const opponent = service.findBestOpponent(tournament, p1, [p1, p2]);

      expect(opponent).toBeNull();
    });
  });

  describe('determineColors', () => {
    test('should assign white to player who should_be_white', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      tournament.players = [p1, p2];

      // p1 played black twice
      tournament.matches = [
        new Match(1, p2.id, p1.id, 1),
        new Match(2, 99, p1.id, 2)
      ];

      const colors = service.determineColors(tournament, p1, p2);

      expect(colors.white.id).toBe(p1.id);
      expect(colors.black.id).toBe(p2.id);
    });

    test('should assign black to player who should_be_black', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      tournament.players = [p1, p2];

      // p1 played white twice
      tournament.matches = [
        new Match(1, p1.id, p2.id, 1),
        new Match(2, p1.id, 99, 2)
      ];

      const colors = service.determineColors(tournament, p1, p2);

      expect(colors.white.id).toBe(p2.id);
      expect(colors.black.id).toBe(p1.id);
    });

    test('should prefer giving white to prefers_white player', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      tournament.players = [p1, p2];

      // p1 played black once
      tournament.matches = [
        new Match(1, p2.id, p1.id, 1)
      ];

      const colors = service.determineColors(tournament, p1, p2);

      expect(colors.white.id).toBe(p1.id);
    });

    test('should give white to lower scored player when both neutral', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      tournament.players = [p1, p2];

      // p2 has higher score
      tournament.matches = [
        createMatchWithResult(1, p2.id, 99, 1, '1-0')
      ];

      const colors = service.determineColors(tournament, p1, p2);

      expect(colors.white.id).toBe(p1.id); // lower score gets white
    });

    test('should handle equal scores with neutral preferences', () => {
      const p1 = new Player(1, 'Jan', 'Peeters');
      const p2 = new Player(2, 'Marie', 'Janssens');
      tournament.players = [p1, p2];

      const colors = service.determineColors(tournament, p1, p2);

      expect(colors.white).toBeDefined();
      expect(colors.black).toBeDefined();
      expect(colors.white.id).not.toBe(colors.black.id);
    });
  });
});

