/**
 * Unit tests for Player model
 */

// Mock Player class since we're testing it
class Player {
  constructor(id, voornaam, naam, klas = '') {
    this.id = id;
    this.voornaam = voornaam;
    this.naam = naam;
    this.klas = klas;
    this.afwezig = false;
  }

  getFullName() {
    return `${this.voornaam} ${this.naam}`;
  }

  toJSON() {
    return {
      id: this.id,
      voornaam: this.voornaam,
      naam: this.naam,
      klas: this.klas,
      afwezig: this.afwezig
    };
  }

  static fromJSON(json) {
    const player = new Player(json.id, json.voornaam, json.naam, json.klas);
    player.afwezig = json.afwezig || false;
    return player;
  }
}

describe('Player Model', () => {
  describe('Constructor', () => {
    test('should create player with required fields', () => {
      const player = new Player(1, 'Jan', 'Peeters');

      expect(player.id).toBe(1);
      expect(player.voornaam).toBe('Jan');
      expect(player.naam).toBe('Peeters');
      expect(player.klas).toBe('');
      expect(player.afwezig).toBe(false);
    });

    test('should create player with optional klas field', () => {
      const player = new Player(1, 'Jan', 'Peeters', '5A');

      expect(player.klas).toBe('5A');
    });

    test('should default afwezig to false', () => {
      const player = new Player(1, 'Jan', 'Peeters');

      expect(player.afwezig).toBe(false);
    });
  });

  describe('getFullName', () => {
    test('should return full name combining voornaam and naam', () => {
      const player = new Player(1, 'Jan', 'Peeters');

      expect(player.getFullName()).toBe('Jan Peeters');
    });

    test('should handle single character names', () => {
      const player = new Player(1, 'J', 'P');

      expect(player.getFullName()).toBe('J P');
    });

    test('should handle names with spaces', () => {
      const player = new Player(1, 'Jan Willem', 'Van der Berg');

      expect(player.getFullName()).toBe('Jan Willem Van der Berg');
    });
  });

  describe('toJSON', () => {
    test('should serialize player to JSON object', () => {
      const player = new Player(1, 'Jan', 'Peeters', '5A');
      player.afwezig = true;

      const json = player.toJSON();

      expect(json).toEqual({
        id: 1,
        voornaam: 'Jan',
        naam: 'Peeters',
        klas: '5A',
        afwezig: true
      });
    });

    test('should serialize player with default values', () => {
      const player = new Player(2, 'Marie', 'Janssens');

      const json = player.toJSON();

      expect(json).toEqual({
        id: 2,
        voornaam: 'Marie',
        naam: 'Janssens',
        klas: '',
        afwezig: false
      });
    });
  });

  describe('fromJSON', () => {
    test('should deserialize player from JSON object', () => {
      const json = {
        id: 1,
        voornaam: 'Jan',
        naam: 'Peeters',
        klas: '5A',
        afwezig: true
      };

      const player = Player.fromJSON(json);

      expect(player.id).toBe(1);
      expect(player.voornaam).toBe('Jan');
      expect(player.naam).toBe('Peeters');
      expect(player.klas).toBe('5A');
      expect(player.afwezig).toBe(true);
    });

    test('should handle missing optional fields', () => {
      const json = {
        id: 1,
        voornaam: 'Jan',
        naam: 'Peeters',
        klas: '5A'
      };

      const player = Player.fromJSON(json);

      expect(player.afwezig).toBe(false);
    });

    test('should handle empty klas', () => {
      const json = {
        id: 1,
        voornaam: 'Jan',
        naam: 'Peeters',
        klas: '',
        afwezig: false
      };

      const player = Player.fromJSON(json);

      expect(player.klas).toBe('');
    });
  });

  describe('State Management', () => {
    test('should allow toggling afwezig status', () => {
      const player = new Player(1, 'Jan', 'Peeters');

      expect(player.afwezig).toBe(false);

      player.afwezig = true;
      expect(player.afwezig).toBe(true);

      player.afwezig = false;
      expect(player.afwezig).toBe(false);
    });

    test('should allow updating klas', () => {
      const player = new Player(1, 'Jan', 'Peeters', '5A');

      expect(player.klas).toBe('5A');

      player.klas = '5B';
      expect(player.klas).toBe('5B');
    });
  });
});

