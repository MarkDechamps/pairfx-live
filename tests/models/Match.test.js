/**
 * Unit tests for Match model
 */

// Mock Match class
class Match {
  constructor(id, whitePlayerId, blackPlayerId, round) {
    this.id = id;
    this.whitePlayerId = whitePlayerId;
    this.blackPlayerId = blackPlayerId;
    this.round = round;
    this.result = null; // null = not played, '1-0', '0-1', '1/2-1/2'
    this.lastPlayedDate = null;
    this.isNew = true;
    this.batchId = null;
  }

  setResult(result) {
    if (!['1-0', '0-1', '1/2-1/2'].includes(result)) {
      throw new Error('Invalid result format');
    }
    this.result = result;
    this.lastPlayedDate = new Date().toISOString();
    this.isNew = false;
  }

  isActive() {
    return this.result === null;
  }

  isFinished() {
    return this.result !== null;
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
    return {
      id: this.id,
      whitePlayerId: this.whitePlayerId,
      blackPlayerId: this.blackPlayerId,
      round: this.round,
      result: this.result,
      lastPlayedDate: this.lastPlayedDate,
      isNew: this.isNew,
      batchId: this.batchId
    };
  }

  static fromJSON(json) {
    const match = new Match(json.id, json.whitePlayerId, json.blackPlayerId, json.round);
    match.result = json.result;
    match.lastPlayedDate = json.lastPlayedDate;
    match.isNew = json.isNew || false;
    match.batchId = json.batchId;
    return match;
  }
}

describe('Match Model', () => {
  describe('Constructor', () => {
    test('should create match with required fields', () => {
      const match = new Match(1, 10, 20, 1);

      expect(match.id).toBe(1);
      expect(match.whitePlayerId).toBe(10);
      expect(match.blackPlayerId).toBe(20);
      expect(match.round).toBe(1);
      expect(match.result).toBeNull();
      expect(match.lastPlayedDate).toBeNull();
      expect(match.isNew).toBe(true);
      expect(match.batchId).toBeNull();
    });

    test('should default to active state (no result)', () => {
      const match = new Match(1, 10, 20, 1);

      expect(match.isActive()).toBe(true);
      expect(match.isFinished()).toBe(false);
    });
  });

  describe('setResult', () => {
    test('should set result to 1-0 (white wins)', () => {
      const match = new Match(1, 10, 20, 1);

      match.setResult('1-0');

      expect(match.result).toBe('1-0');
      expect(match.lastPlayedDate).not.toBeNull();
      expect(match.isNew).toBe(false);
    });

    test('should set result to 0-1 (black wins)', () => {
      const match = new Match(1, 10, 20, 1);

      match.setResult('0-1');

      expect(match.result).toBe('0-1');
    });

    test('should set result to 1/2-1/2 (draw)', () => {
      const match = new Match(1, 10, 20, 1);

      match.setResult('1/2-1/2');

      expect(match.result).toBe('1/2-1/2');
    });

    test('should throw error for invalid result', () => {
      const match = new Match(1, 10, 20, 1);

      expect(() => match.setResult('2-0')).toThrow('Invalid result format');
      expect(() => match.setResult('draw')).toThrow('Invalid result format');
      expect(() => match.setResult('')).toThrow('Invalid result format');
    });

    test('should set timestamp when result is entered', () => {
      const match = new Match(1, 10, 20, 1);
      const before = new Date();

      match.setResult('1-0');

      const after = new Date();
      const timestamp = new Date(match.lastPlayedDate);

      expect(timestamp >= before).toBe(true);
      expect(timestamp <= after).toBe(true);
    });

    test('should mark match as not new when result is entered', () => {
      const match = new Match(1, 10, 20, 1);
      expect(match.isNew).toBe(true);

      match.setResult('1-0');

      expect(match.isNew).toBe(false);
    });
  });

  describe('isActive', () => {
    test('should return true for matches without result', () => {
      const match = new Match(1, 10, 20, 1);

      expect(match.isActive()).toBe(true);
    });

    test('should return false for matches with result', () => {
      const match = new Match(1, 10, 20, 1);
      match.setResult('1-0');

      expect(match.isActive()).toBe(false);
    });
  });

  describe('isFinished', () => {
    test('should return false for matches without result', () => {
      const match = new Match(1, 10, 20, 1);

      expect(match.isFinished()).toBe(false);
    });

    test('should return true for matches with result', () => {
      const match = new Match(1, 10, 20, 1);
      match.setResult('1-0');

      expect(match.isFinished()).toBe(true);
    });
  });

  describe('getWhiteScore', () => {
    test('should return 1 for white win', () => {
      const match = new Match(1, 10, 20, 1);
      match.setResult('1-0');

      expect(match.getWhiteScore()).toBe(1);
    });

    test('should return 0 for black win', () => {
      const match = new Match(1, 10, 20, 1);
      match.setResult('0-1');

      expect(match.getWhiteScore()).toBe(0);
    });

    test('should return 0.5 for draw', () => {
      const match = new Match(1, 10, 20, 1);
      match.setResult('1/2-1/2');

      expect(match.getWhiteScore()).toBe(0.5);
    });

    test('should return 0 for active match', () => {
      const match = new Match(1, 10, 20, 1);

      expect(match.getWhiteScore()).toBe(0);
    });
  });

  describe('getBlackScore', () => {
    test('should return 0 for white win', () => {
      const match = new Match(1, 10, 20, 1);
      match.setResult('1-0');

      expect(match.getBlackScore()).toBe(0);
    });

    test('should return 1 for black win', () => {
      const match = new Match(1, 10, 20, 1);
      match.setResult('0-1');

      expect(match.getBlackScore()).toBe(1);
    });

    test('should return 0.5 for draw', () => {
      const match = new Match(1, 10, 20, 1);
      match.setResult('1/2-1/2');

      expect(match.getBlackScore()).toBe(0.5);
    });

    test('should return 0 for active match', () => {
      const match = new Match(1, 10, 20, 1);

      expect(match.getBlackScore()).toBe(0);
    });
  });

  describe('toJSON', () => {
    test('should serialize active match to JSON', () => {
      const match = new Match(1, 10, 20, 1);
      match.batchId = 'batch-123';

      const json = match.toJSON();

      expect(json).toEqual({
        id: 1,
        whitePlayerId: 10,
        blackPlayerId: 20,
        round: 1,
        result: null,
        lastPlayedDate: null,
        isNew: true,
        batchId: 'batch-123'
      });
    });

    test('should serialize finished match to JSON', () => {
      const match = new Match(1, 10, 20, 1);
      match.setResult('1-0');

      const json = match.toJSON();

      expect(json.result).toBe('1-0');
      expect(json.lastPlayedDate).not.toBeNull();
      expect(json.isNew).toBe(false);
    });
  });

  describe('fromJSON', () => {
    test('should deserialize active match from JSON', () => {
      const json = {
        id: 1,
        whitePlayerId: 10,
        blackPlayerId: 20,
        round: 1,
        result: null,
        lastPlayedDate: null,
        isNew: true,
        batchId: 'batch-123'
      };

      const match = Match.fromJSON(json);

      expect(match.id).toBe(1);
      expect(match.whitePlayerId).toBe(10);
      expect(match.blackPlayerId).toBe(20);
      expect(match.round).toBe(1);
      expect(match.result).toBeNull();
      expect(match.isNew).toBe(true);
      expect(match.batchId).toBe('batch-123');
    });

    test('should deserialize finished match from JSON', () => {
      const json = {
        id: 1,
        whitePlayerId: 10,
        blackPlayerId: 20,
        round: 1,
        result: '1-0',
        lastPlayedDate: '2025-12-12T10:00:00.000Z',
        isNew: false,
        batchId: 'batch-123'
      };

      const match = Match.fromJSON(json);

      expect(match.result).toBe('1-0');
      expect(match.lastPlayedDate).toBe('2025-12-12T10:00:00.000Z');
      expect(match.isNew).toBe(false);
    });

    test('should default isNew to false if not provided', () => {
      const json = {
        id: 1,
        whitePlayerId: 10,
        blackPlayerId: 20,
        round: 1,
        result: null,
        lastPlayedDate: null,
        batchId: null
      };

      const match = Match.fromJSON(json);

      expect(match.isNew).toBe(false);
    });
  });

  describe('Batch Operations', () => {
    test('should support batch identification', () => {
      const match = new Match(1, 10, 20, 1);
      match.batchId = 'batch-abc';

      expect(match.batchId).toBe('batch-abc');
    });

    test('should serialize batchId', () => {
      const match = new Match(1, 10, 20, 1);
      match.batchId = 'batch-xyz';

      const json = match.toJSON();

      expect(json.batchId).toBe('batch-xyz');
    });
  });
});

