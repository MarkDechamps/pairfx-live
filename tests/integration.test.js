/**
 * Integration tests for complete tournament workflow
 * Tests end-to-end scenarios combining multiple components
 */

// Mock all classes for integration testing
class Player {
  constructor(id, voornaam, naam, klas = '') {
    this.id = id;
    this.voornaam = voornaam;
    this.naam = naam;
    this.klas = klas;
    this.afwezig = false;
  }
  toJSON() {
    return { id: this.id, voornaam: this.voornaam, naam: this.naam, klas: this.klas, afwezig: this.afwezig };
  }
  static fromJSON(json) {
    const p = new Player(json.id, json.voornaam, json.naam, json.klas);
    p.afwezig = json.afwezig || false;
    return p;
  }
}

class Match {
  constructor(id, whitePlayerId, blackPlayerId, round) {
    this.id = id;
    this.whitePlayerId = whitePlayerId;
    this.blackPlayerId = blackPlayerId;
    this.round = round;
    this.result = null;
    this.lastPlayedDate = null;
    this.isNew = true;
    this.batchId = null;
  }
  isActive() { return this.result === null; }
  isFinished() { return this.result !== null; }
  setResult(result) {
    this.result = result;
    this.lastPlayedDate = new Date().toISOString();
    this.isNew = false;
  }
  getWhiteScore() {
    if (this.result === '1-0') return 1;
    if (this.result === '0-1') return 0;
    if (this.result === '1/2-1/2') return 0.5;
    return 0;
  }
  getBlackScore() {
    if (this.result === '1-0') return 0;
    if (this.result === '0-1') return 1;
    if (this.result === '1/2-1/2') return 0.5;
    return 0;
  }
  toJSON() {
    return { id: this.id, whitePlayerId: this.whitePlayerId, blackPlayerId: this.blackPlayerId,
      round: this.round, result: this.result, lastPlayedDate: this.lastPlayedDate,
      isNew: this.isNew, batchId: this.batchId };
  }
  static fromJSON(json) {
    const m = new Match(json.id, json.whitePlayerId, json.blackPlayerId, json.round);
    m.result = json.result;
    m.lastPlayedDate = json.lastPlayedDate;
    m.isNew = json.isNew || false;
    m.batchId = json.batchId;
    return m;
  }
}

class Tournament {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.players = [];
    this.matches = [];
    this.creationDate = new Date().toISOString();
    this.settings = {
      format: 'run-through',
      displayMode: 'points',
      constraintX: 3,
      constraintY: 3,
      avoidSameClass: false
    };
    this.nextPlayerId = 1;
    this.nextMatchId = 1;
  }
  addPlayer(voornaam, naam, klas = '') {
    const player = new Player(this.nextPlayerId++, voornaam, naam, klas);
    this.players.push(player);
    return player;
  }
  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
    this.matches = this.matches.filter(m =>
      m.whitePlayerId !== playerId && m.blackPlayerId !== playerId
    );
  }
  addMatch(whitePlayerId, blackPlayerId, round) {
    const match = new Match(this.nextMatchId++, whitePlayerId, blackPlayerId, round);
    this.matches.push(match);
    return match;
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
      if (match.whitePlayerId === playerId) score += match.getWhiteScore();
      else if (match.blackPlayerId === playerId) score += match.getBlackScore();
    }
    return score;
  }
  calculatePlayerColourPreference(playerId) {
    let whiteCount = 0, blackCount = 0;
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
  toJSON() {
    return {
      id: this.id, name: this.name, players: this.players.map(p => p.toJSON()),
      matches: this.matches.map(m => m.toJSON()), creationDate: this.creationDate,
      settings: this.settings, nextPlayerId: this.nextPlayerId, nextMatchId: this.nextMatchId
    };
  }
  static fromJSON(json) {
    const t = new Tournament(json.id, json.name);
    t.players = json.players.map(p => Player.fromJSON(p));
    t.matches = json.matches.map(m => Match.fromJSON(m));
    t.creationDate = json.creationDate;
    t.settings = json.settings;
    t.nextPlayerId = json.nextPlayerId;
    t.nextMatchId = json.nextMatchId;
    return t;
  }
}

class PairingService {
  getAvailablePlayers(tournament) {
    return tournament.players.filter(p => {
      if (p.afwezig) return false;
      return !tournament.matches.some(m =>
        m.isActive() && (m.whitePlayerId === p.id || m.blackPlayerId === p.id)
      );
    });
  }

  createAutomaticPairings(tournament) {
    const available = this.getAvailablePlayers(tournament);
    const paired = new Set();
    const pairings = [];

    for (const player of available) {
      if (paired.has(player.id)) continue;

      const opponent = available.find(p =>
        p.id !== player.id && !paired.has(p.id)
      );

      if (opponent) {
        const match = tournament.addMatch(player.id, opponent.id, 1);
        pairings.push(match);
        paired.add(player.id);
        paired.add(opponent.id);
      }
    }

    return pairings;
  }
}

class StorageService {
  constructor() {
    this.STORAGE_PREFIX = 'pairfx_tournament_';
    this.TOURNAMENT_LIST_KEY = 'pairfx_tournament_list';
  }
  saveTournament(tournament) {
    const key = this.STORAGE_PREFIX + tournament.id;
    localStorage.setItem(key, JSON.stringify(tournament.toJSON()));
    this.updateTournamentList(tournament);
  }
  loadTournament(tournamentId) {
    const key = this.STORAGE_PREFIX + tournamentId;
    const data = localStorage.getItem(key);
    return data ? Tournament.fromJSON(JSON.parse(data)) : null;
  }
  updateTournamentList(tournament) {
    const list = this.getAllTournaments();
    const metadata = {
      id: tournament.id, name: tournament.name, creationDate: tournament.creationDate,
      playerCount: tournament.players.length, matchCount: tournament.matches.length
    };
    const index = list.findIndex(t => t.id === tournament.id);
    if (index >= 0) list[index] = metadata;
    else list.push(metadata);
    localStorage.setItem(this.TOURNAMENT_LIST_KEY, JSON.stringify(list));
  }
  getAllTournaments() {
    const data = localStorage.getItem(this.TOURNAMENT_LIST_KEY);
    return data ? JSON.parse(data) : [];
  }
}

describe('Integration Tests - Complete Tournament Workflow', () => {
  let tournament;
  let pairingService;
  let storageService;

  beforeEach(() => {
    localStorage.clear();
    tournament = new Tournament(1, 'Club Championship');
    pairingService = new PairingService();
    storageService = new StorageService();
  });

  describe('Complete Tournament Lifecycle', () => {
    test('should handle complete tournament from creation to results', () => {
      // 1. Create tournament
      expect(tournament.name).toBe('Club Championship');
      expect(tournament.players).toHaveLength(0);

      // 2. Add players
      const p1 = tournament.addPlayer('Jan', 'Peeters', '5A');
      const p2 = tournament.addPlayer('Marie', 'Janssens', '5A');
      const p3 = tournament.addPlayer('Tom', 'Wouters', '5B');
      const p4 = tournament.addPlayer('Lisa', 'Claes', '5B');

      expect(tournament.players).toHaveLength(4);

      // 3. Create pairings
      const pairings = pairingService.createAutomaticPairings(tournament);

      expect(pairings).toHaveLength(2); // 4 players = 2 matches

      // 4. Enter results
      pairings[0].setResult('1-0');
      pairings[1].setResult('1/2-1/2');

      // 5. Verify scores
      const scores = tournament.players.map(p => ({
        id: p.id,
        score: tournament.calculatePlayerScore(p.id)
      }));

      const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
      expect(totalScore).toBe(2); // 1 win + 2 draws = 2 points total

      // 6. Save tournament
      storageService.saveTournament(tournament);

      // 7. Load tournament
      const loaded = storageService.loadTournament(1);

      expect(loaded.players).toHaveLength(4);
      expect(loaded.matches).toHaveLength(2);
      expect(loaded.matches[0].result).toBe('1-0');
    });

    test('should handle multiple rounds with color balancing', () => {
      // Setup
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');

      // Round 1: p1 plays white
      const r1 = tournament.addMatch(p1.id, p2.id, 1);
      r1.setResult('1-0');

      // Check color preference
      expect(tournament.calculatePlayerColourPreference(p1.id)).toBe('prefers_black');
      expect(tournament.calculatePlayerColourPreference(p2.id)).toBe('prefers_white');

      // Round 2: p1 plays white again
      const r2 = tournament.addMatch(p1.id, p2.id, 2);
      r2.setResult('1/2-1/2');

      // Now p1 should_be_black
      expect(tournament.calculatePlayerColourPreference(p1.id)).toBe('should_be_black');

      // Verify scores
      expect(tournament.calculatePlayerScore(p1.id)).toBe(1.5);
      expect(tournament.calculatePlayerScore(p2.id)).toBe(0.5);
    });

    test('should handle player removal with cascade delete', () => {
      // Add players and create matches
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');
      const p3 = tournament.addPlayer('Tom', 'Wouters');

      tournament.addMatch(p1.id, p2.id, 1);
      tournament.addMatch(p1.id, p3.id, 2);
      tournament.addMatch(p2.id, p3.id, 1);

      expect(tournament.matches).toHaveLength(3);

      // Remove p1
      tournament.removePlayer(p1.id);

      // Verify
      expect(tournament.players).toHaveLength(2);
      expect(tournament.matches).toHaveLength(1); // Only p2 vs p3 remains
      expect(tournament.matches[0].whitePlayerId).toBe(p2.id);
      expect(tournament.matches[0].blackPlayerId).toBe(p3.id);
    });

    test('should handle absent players in pairing', () => {
      // Add players
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');
      const p3 = tournament.addPlayer('Tom', 'Wouters');
      const p4 = tournament.addPlayer('Lisa', 'Claes');

      // Mark p2 as absent
      p2.afwezig = true;

      // Create pairings
      const pairings = pairingService.createAutomaticPairings(tournament);

      // Should only pair p1, p3, p4 (p2 is absent)
      expect(pairings).toHaveLength(1); // Only 1 pairing possible (3 available players)

      // Verify p2 is not in any pairing
      pairings.forEach(match => {
        expect(match.whitePlayerId).not.toBe(p2.id);
        expect(match.blackPlayerId).not.toBe(p2.id);
      });
    });

    test('should preserve data through JSON export/import', () => {
      // Setup complete tournament
      const p1 = tournament.addPlayer('Jan', 'Peeters', '5A');
      const p2 = tournament.addPlayer('Marie', 'Janssens', '5B');
      p2.afwezig = true;

      const match = tournament.addMatch(p1.id, p2.id, 1);
      match.setResult('1-0');

      tournament.settings.avoidSameClass = true;
      tournament.settings.constraintX = 5;

      // Export
      const json = JSON.stringify(tournament.toJSON());

      // Import
      const restored = Tournament.fromJSON(JSON.parse(json));

      // Verify everything is preserved
      expect(restored.id).toBe(tournament.id);
      expect(restored.name).toBe(tournament.name);
      expect(restored.players).toHaveLength(2);
      expect(restored.players[1].afwezig).toBe(true);
      expect(restored.matches).toHaveLength(1);
      expect(restored.matches[0].result).toBe('1-0');
      expect(restored.settings.avoidSameClass).toBe(true);
      expect(restored.settings.constraintX).toBe(5);
      expect(restored.calculatePlayerScore(p1.id)).toBe(1);
    });

    test('should handle multiple tournaments in storage', () => {
      // Create multiple tournaments
      const t1 = new Tournament(1, 'Tournament 1');
      const t2 = new Tournament(2, 'Tournament 2');
      const t3 = new Tournament(3, 'Tournament 3');

      t1.addPlayer('Jan', 'Peeters');
      t2.addPlayer('Marie', 'Janssens');
      t2.addPlayer('Tom', 'Wouters');

      // Save all
      storageService.saveTournament(t1);
      storageService.saveTournament(t2);
      storageService.saveTournament(t3);

      // Verify list
      const list = storageService.getAllTournaments();
      expect(list).toHaveLength(3);
      expect(list[0].playerCount).toBe(1);
      expect(list[1].playerCount).toBe(2);
      expect(list[2].playerCount).toBe(0);

      // Load specific tournament
      const loaded = storageService.loadTournament(2);
      expect(loaded.name).toBe('Tournament 2');
      expect(loaded.players).toHaveLength(2);
    });
  });

  describe('Error Cases and Edge Scenarios', () => {
    test('should handle odd number of players in pairing', () => {
      tournament.addPlayer('Jan', 'Peeters');
      tournament.addPlayer('Marie', 'Janssens');
      tournament.addPlayer('Tom', 'Wouters'); // odd number

      const pairings = pairingService.createAutomaticPairings(tournament);

      expect(pairings).toHaveLength(1); // 2 paired, 1 unpaired
    });

    test('should handle empty tournament pairing', () => {
      const pairings = pairingService.createAutomaticPairings(tournament);

      expect(pairings).toHaveLength(0);
    });

    test('should handle single player pairing', () => {
      tournament.addPlayer('Jan', 'Peeters');

      const pairings = pairingService.createAutomaticPairings(tournament);

      expect(pairings).toHaveLength(0); // Can't pair 1 player
    });

    test('should handle all players absent', () => {
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');
      p1.afwezig = true;
      p2.afwezig = true;

      const pairings = pairingService.createAutomaticPairings(tournament);

      expect(pairings).toHaveLength(0);
    });

    test('should handle all players in active matches', () => {
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');

      // Create active match
      tournament.addMatch(p1.id, p2.id, 1);

      const available = pairingService.getAvailablePlayers(tournament);

      expect(available).toHaveLength(0);
    });

    test('should not affect other tournaments when saving', () => {
      const t1 = new Tournament(1, 'T1');
      const t2 = new Tournament(2, 'T2');

      t1.addPlayer('Jan', 'Peeters');
      t2.addPlayer('Marie', 'Janssens');

      storageService.saveTournament(t1);
      storageService.saveTournament(t2);

      // Modify t1
      t1.addPlayer('Tom', 'Wouters');
      storageService.saveTournament(t1);

      // Load t2 - should be unchanged
      const loaded = storageService.loadTournament(2);
      expect(loaded.players).toHaveLength(1);
      expect(loaded.players[0].voornaam).toBe('Marie');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle tournament with many players', () => {
      // Add 50 players
      for (let i = 1; i <= 50; i++) {
        tournament.addPlayer(`Player${i}`, `Last${i}`, `Class${i % 5}`);
      }

      expect(tournament.players).toHaveLength(50);

      // Create pairings
      const pairings = pairingService.createAutomaticPairings(tournament);

      expect(pairings).toHaveLength(25); // 50 players = 25 matches

      // Save and load
      storageService.saveTournament(tournament);
      const loaded = storageService.loadTournament(1);

      expect(loaded.players).toHaveLength(50);
    });

    test('should handle many rounds and matches', () => {
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');

      // Simulate 20 rounds
      for (let round = 1; round <= 20; round++) {
        const match = tournament.addMatch(
          round % 2 === 0 ? p1.id : p2.id,
          round % 2 === 0 ? p2.id : p1.id,
          round
        );
        match.setResult(round % 3 === 0 ? '1/2-1/2' : (round % 2 === 0 ? '1-0' : '0-1'));
      }

      expect(tournament.matches).toHaveLength(20);

      // Calculate final scores
      const score1 = tournament.calculatePlayerScore(p1.id);
      const score2 = tournament.calculatePlayerScore(p2.id);

      expect(score1 + score2).toBeCloseTo(20, 1); // Total points should equal number of matches

      // Verify serialization works
      const json = JSON.stringify(tournament.toJSON());
      const restored = Tournament.fromJSON(JSON.parse(json));

      expect(restored.matches).toHaveLength(20);
      expect(restored.calculatePlayerScore(p1.id)).toBe(score1);
    });
  });
});

