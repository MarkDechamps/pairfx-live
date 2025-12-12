/**
 * Unit tests for Tournament model
 */

// Mock dependencies
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
  setResult(result) {
    this.result = result;
    this.lastPlayedDate = new Date().toISOString();
    this.isNew = false;
  }
  toJSON() {
    return {
      id: this.id, whitePlayerId: this.whitePlayerId, blackPlayerId: this.blackPlayerId,
      round: this.round, result: this.result, lastPlayedDate: this.lastPlayedDate,
      isNew: this.isNew, batchId: this.batchId
    };
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

// Mock Tournament class
class Tournament {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.players = [];
    this.matches = [];
    this.creationDate = new Date().toISOString();
    this.settings = {
      format: 'run-through', // 'run-through' or 'round-robin'
      displayMode: 'points', // 'points' or 'percentage'
      constraintX: 3, // rounds
      constraintY: 3, // points
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

  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  addMatch(whitePlayerId, blackPlayerId, round) {
    const match = new Match(this.nextMatchId++, whitePlayerId, blackPlayerId, round);
    this.matches.push(match);
    return match;
  }

  calculatePlayerScore(playerId) {
    let score = 0;
    for (const match of this.matches) {
      if (!match.isFinished()) continue;
      if (match.whitePlayerId === playerId) {
        score += match.getWhiteScore();
      } else if (match.blackPlayerId === playerId) {
        score += match.getBlackScore();
      }
    }
    return score;
  }

  calculatePlayerPercentage(playerId) {
    const finishedMatches = this.matches.filter(m =>
      m.isFinished() && (m.whitePlayerId === playerId || m.blackPlayerId === playerId)
    );
    if (finishedMatches.length === 0) return 0;
    const score = this.calculatePlayerScore(playerId);
    return (score / finishedMatches.length) * 100;
  }

  getPlayerMatches(playerId) {
    return this.matches.filter(m =>
      m.whitePlayerId === playerId || m.blackPlayerId === playerId
    );
  }

  calculatePlayerColourPreference(playerId) {
    let whiteCount = 0;
    let blackCount = 0;

    for (const match of this.matches) {
      if (match.whitePlayerId === playerId) whiteCount++;
      if (match.blackPlayerId === playerId) blackCount++;
    }

    const difference = whiteCount - blackCount;

    if (difference >= 2) return 'should_be_black';
    if (difference <= -2) return 'should_be_white';
    if (difference === 1) return 'prefers_black';
    if (difference === -1) return 'prefers_white';
    return 'neutral';
  }

  getCurrentRound() {
    if (this.matches.length === 0) return 1;
    return Math.max(...this.matches.map(m => m.round));
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      players: this.players.map(p => p.toJSON()),
      matches: this.matches.map(m => m.toJSON()),
      creationDate: this.creationDate,
      settings: this.settings,
      nextPlayerId: this.nextPlayerId,
      nextMatchId: this.nextMatchId
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

describe('Tournament Model', () => {
  describe('Constructor', () => {
    test('should create tournament with required fields', () => {
      const tournament = new Tournament(1, 'Test Tournament');

      expect(tournament.id).toBe(1);
      expect(tournament.name).toBe('Test Tournament');
      expect(tournament.players).toEqual([]);
      expect(tournament.matches).toEqual([]);
      expect(tournament.creationDate).not.toBeNull();
    });

    test('should initialize with default settings', () => {
      const tournament = new Tournament(1, 'Test');

      expect(tournament.settings).toEqual({
        format: 'run-through',
        displayMode: 'points',
        constraintX: 3,
        constraintY: 3,
        avoidSameClass: false
      });
    });

    test('should initialize player and match ID counters', () => {
      const tournament = new Tournament(1, 'Test');

      expect(tournament.nextPlayerId).toBe(1);
      expect(tournament.nextMatchId).toBe(1);
    });
  });

  describe('Player Management', () => {
    test('should add player and assign unique ID', () => {
      const tournament = new Tournament(1, 'Test');

      const player = tournament.addPlayer('Jan', 'Peeters', '5A');

      expect(player.id).toBe(1);
      expect(player.voornaam).toBe('Jan');
      expect(player.naam).toBe('Peeters');
      expect(player.klas).toBe('5A');
      expect(tournament.players).toHaveLength(1);
      expect(tournament.nextPlayerId).toBe(2);
    });

    test('should assign sequential IDs to multiple players', () => {
      const tournament = new Tournament(1, 'Test');

      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');
      const p3 = tournament.addPlayer('Tom', 'Wouters');

      expect(p1.id).toBe(1);
      expect(p2.id).toBe(2);
      expect(p3.id).toBe(3);
      expect(tournament.nextPlayerId).toBe(4);
    });

    test('should remove player by ID', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');

      tournament.removePlayer(p1.id);

      expect(tournament.players).toHaveLength(1);
      expect(tournament.players[0].id).toBe(p2.id);
    });

    test('should remove all matches involving removed player', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');
      const p3 = tournament.addPlayer('Tom', 'Wouters');

      tournament.addMatch(p1.id, p2.id, 1);
      tournament.addMatch(p2.id, p3.id, 1);

      expect(tournament.matches).toHaveLength(2);

      tournament.removePlayer(p2.id);

      expect(tournament.matches).toHaveLength(0);
    });

    test('should get player by ID', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');

      const found = tournament.getPlayer(p1.id);

      expect(found).toBe(p1);
    });

    test('should return undefined for non-existent player', () => {
      const tournament = new Tournament(1, 'Test');

      const found = tournament.getPlayer(999);

      expect(found).toBeUndefined();
    });
  });

  describe('Match Management', () => {
    test('should add match and assign unique ID', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');

      const match = tournament.addMatch(p1.id, p2.id, 1);

      expect(match.id).toBe(1);
      expect(match.whitePlayerId).toBe(p1.id);
      expect(match.blackPlayerId).toBe(p2.id);
      expect(match.round).toBe(1);
      expect(tournament.matches).toHaveLength(1);
      expect(tournament.nextMatchId).toBe(2);
    });

    test('should assign sequential IDs to multiple matches', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');
      const p3 = tournament.addPlayer('Tom', 'Wouters');
      const p4 = tournament.addPlayer('Lisa', 'Claes');

      const m1 = tournament.addMatch(p1.id, p2.id, 1);
      const m2 = tournament.addMatch(p3.id, p4.id, 1);

      expect(m1.id).toBe(1);
      expect(m2.id).toBe(2);
      expect(tournament.nextMatchId).toBe(3);
    });

    test('should get all matches for a player', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');
      const p3 = tournament.addPlayer('Tom', 'Wouters');

      tournament.addMatch(p1.id, p2.id, 1);
      tournament.addMatch(p1.id, p3.id, 2);
      tournament.addMatch(p2.id, p3.id, 2);

      const p1Matches = tournament.getPlayerMatches(p1.id);

      expect(p1Matches).toHaveLength(2);
      expect(p1Matches.every(m =>
        m.whitePlayerId === p1.id || m.blackPlayerId === p1.id
      )).toBe(true);
    });
  });

  describe('Score Calculation', () => {
    test('should calculate score for player with wins', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');
      const p3 = tournament.addPlayer('Tom', 'Wouters');

      const m1 = tournament.addMatch(p1.id, p2.id, 1);
      const m2 = tournament.addMatch(p1.id, p3.id, 2);

      m1.setResult('1-0'); // p1 wins
      m2.setResult('1-0'); // p1 wins

      expect(tournament.calculatePlayerScore(p1.id)).toBe(2);
    });

    test('should calculate score for player with losses', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');

      const m1 = tournament.addMatch(p1.id, p2.id, 1);
      m1.setResult('0-1'); // p1 loses

      expect(tournament.calculatePlayerScore(p1.id)).toBe(0);
    });

    test('should calculate score for player with draws', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');
      const p3 = tournament.addPlayer('Tom', 'Wouters');

      const m1 = tournament.addMatch(p1.id, p2.id, 1);
      const m2 = tournament.addMatch(p1.id, p3.id, 2);

      m1.setResult('1/2-1/2'); // draw
      m2.setResult('1/2-1/2'); // draw

      expect(tournament.calculatePlayerScore(p1.id)).toBe(1);
    });

    test('should calculate score for mixed results', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');
      const p3 = tournament.addPlayer('Tom', 'Wouters');
      const p4 = tournament.addPlayer('Lisa', 'Claes');

      const m1 = tournament.addMatch(p1.id, p2.id, 1);
      const m2 = tournament.addMatch(p1.id, p3.id, 2);
      const m3 = tournament.addMatch(p1.id, p4.id, 3);

      m1.setResult('1-0'); // win = 1
      m2.setResult('1/2-1/2'); // draw = 0.5
      m3.setResult('0-1'); // loss = 0

      expect(tournament.calculatePlayerScore(p1.id)).toBe(1.5);
    });

    test('should not count active matches in score', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');

      tournament.addMatch(p1.id, p2.id, 1); // active, no result

      expect(tournament.calculatePlayerScore(p1.id)).toBe(0);
    });

    test('should return 0 for player with no matches', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');

      expect(tournament.calculatePlayerScore(p1.id)).toBe(0);
    });
  });

  describe('Percentage Calculation', () => {
    test('should calculate percentage for player with 100% wins', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');
      const p3 = tournament.addPlayer('Tom', 'Wouters');

      const m1 = tournament.addMatch(p1.id, p2.id, 1);
      const m2 = tournament.addMatch(p1.id, p3.id, 2);

      m1.setResult('1-0');
      m2.setResult('1-0');

      expect(tournament.calculatePlayerPercentage(p1.id)).toBe(100);
    });

    test('should calculate percentage for player with 50% score', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');
      const p3 = tournament.addPlayer('Tom', 'Wouters');

      const m1 = tournament.addMatch(p1.id, p2.id, 1);
      const m2 = tournament.addMatch(p1.id, p3.id, 2);

      m1.setResult('1-0'); // win
      m2.setResult('0-1'); // loss

      expect(tournament.calculatePlayerPercentage(p1.id)).toBe(50);
    });

    test('should return 0 for player with no finished matches', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');

      expect(tournament.calculatePlayerPercentage(p1.id)).toBe(0);
    });
  });

  describe('Colour Preference', () => {
    test('should return neutral for new player', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');

      expect(tournament.calculatePlayerColourPreference(p1.id)).toBe('neutral');
    });

    test('should return should_be_black after 2+ more whites', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');
      const p3 = tournament.addPlayer('Tom', 'Wouters');

      tournament.addMatch(p1.id, p2.id, 1); // p1 white
      tournament.addMatch(p1.id, p3.id, 2); // p1 white

      expect(tournament.calculatePlayerColourPreference(p1.id)).toBe('should_be_black');
    });

    test('should return should_be_white after 2+ more blacks', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');
      const p3 = tournament.addPlayer('Tom', 'Wouters');

      tournament.addMatch(p2.id, p1.id, 1); // p1 black
      tournament.addMatch(p3.id, p1.id, 2); // p1 black

      expect(tournament.calculatePlayerColourPreference(p1.id)).toBe('should_be_white');
    });

    test('should return prefers_black after 1 more white', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');

      tournament.addMatch(p1.id, p2.id, 1); // p1 white

      expect(tournament.calculatePlayerColourPreference(p1.id)).toBe('prefers_black');
    });

    test('should return prefers_white after 1 more black', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');

      tournament.addMatch(p2.id, p1.id, 1); // p1 black

      expect(tournament.calculatePlayerColourPreference(p1.id)).toBe('prefers_white');
    });

    test('should return neutral when equal colors', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');
      const p3 = tournament.addPlayer('Tom', 'Wouters');

      tournament.addMatch(p1.id, p2.id, 1); // p1 white
      tournament.addMatch(p3.id, p1.id, 2); // p1 black

      expect(tournament.calculatePlayerColourPreference(p1.id)).toBe('neutral');
    });
  });

  describe('Round Management', () => {
    test('should return 1 for new tournament', () => {
      const tournament = new Tournament(1, 'Test');

      expect(tournament.getCurrentRound()).toBe(1);
    });

    test('should return highest round number', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters');
      const p2 = tournament.addPlayer('Marie', 'Janssens');
      const p3 = tournament.addPlayer('Tom', 'Wouters');

      tournament.addMatch(p1.id, p2.id, 1);
      tournament.addMatch(p1.id, p3.id, 5);
      tournament.addMatch(p2.id, p3.id, 3);

      expect(tournament.getCurrentRound()).toBe(5);
    });
  });

  describe('Serialization', () => {
    test('should serialize tournament to JSON', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters', '5A');
      const p2 = tournament.addPlayer('Marie', 'Janssens', '5B');
      tournament.addMatch(p1.id, p2.id, 1);

      const json = tournament.toJSON();

      expect(json.id).toBe(1);
      expect(json.name).toBe('Test');
      expect(json.players).toHaveLength(2);
      expect(json.matches).toHaveLength(1);
      expect(json.settings).toBeDefined();
      expect(json.creationDate).toBeDefined();
    });

    test('should deserialize tournament from JSON', () => {
      const json = {
        id: 1,
        name: 'Test',
        players: [
          { id: 1, voornaam: 'Jan', naam: 'Peeters', klas: '5A', afwezig: false }
        ],
        matches: [
          { id: 1, whitePlayerId: 1, blackPlayerId: 2, round: 1, result: null,
            lastPlayedDate: null, isNew: true, batchId: null }
        ],
        creationDate: '2025-12-12T10:00:00.000Z',
        settings: { format: 'run-through', displayMode: 'points', constraintX: 3,
                    constraintY: 3, avoidSameClass: false },
        nextPlayerId: 2,
        nextMatchId: 2
      };

      const tournament = Tournament.fromJSON(json);

      expect(tournament.id).toBe(1);
      expect(tournament.name).toBe('Test');
      expect(tournament.players).toHaveLength(1);
      expect(tournament.matches).toHaveLength(1);
      expect(tournament.nextPlayerId).toBe(2);
      expect(tournament.nextMatchId).toBe(2);
    });

    test('should preserve all data through serialization round-trip', () => {
      const tournament = new Tournament(1, 'Test');
      const p1 = tournament.addPlayer('Jan', 'Peeters', '5A');
      const p2 = tournament.addPlayer('Marie', 'Janssens', '5B');
      const match = tournament.addMatch(p1.id, p2.id, 1);
      match.setResult('1-0');
      tournament.settings.avoidSameClass = true;

      const json = tournament.toJSON();
      const restored = Tournament.fromJSON(json);

      expect(restored.id).toBe(tournament.id);
      expect(restored.name).toBe(tournament.name);
      expect(restored.players).toHaveLength(tournament.players.length);
      expect(restored.matches).toHaveLength(tournament.matches.length);
      expect(restored.matches[0].result).toBe('1-0');
      expect(restored.settings.avoidSameClass).toBe(true);
    });
  });
});

