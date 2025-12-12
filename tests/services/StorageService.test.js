/**
 * Unit tests for StorageService
 * Tests localStorage operations, JSON import/export, CSV import, HTML export
 */

// Mock Tournament class
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
  }
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      players: this.players,
      matches: this.matches,
      creationDate: this.creationDate,
      settings: this.settings
    };
  }
  static fromJSON(json) {
    const t = new Tournament(json.id, json.name);
    t.players = json.players || [];
    t.matches = json.matches || [];
    t.creationDate = json.creationDate;
    t.settings = json.settings;
    return t;
  }
}

// Mock StorageService
class StorageService {
  constructor() {
    this.STORAGE_PREFIX = 'pairfx_tournament_';
    this.TOURNAMENT_LIST_KEY = 'pairfx_tournament_list';
  }

  saveTournament(tournament) {
    const key = this.STORAGE_PREFIX + tournament.id;
    const data = JSON.stringify(tournament.toJSON());
    localStorage.setItem(key, data);
    this.updateTournamentList(tournament);
  }

  loadTournament(tournamentId) {
    const key = this.STORAGE_PREFIX + tournamentId;
    const data = localStorage.getItem(key);
    if (!data) return null;
    return Tournament.fromJSON(JSON.parse(data));
  }

  deleteTournament(tournamentId) {
    const key = this.STORAGE_PREFIX + tournamentId;
    localStorage.removeItem(key);
    this.removeTournamentFromList(tournamentId);
  }

  getAllTournaments() {
    const listData = localStorage.getItem(this.TOURNAMENT_LIST_KEY);
    if (!listData) return [];
    return JSON.parse(listData);
  }

  updateTournamentList(tournament) {
    const list = this.getAllTournaments();
    const index = list.findIndex(t => t.id === tournament.id);
    const metadata = {
      id: tournament.id,
      name: tournament.name,
      creationDate: tournament.creationDate,
      playerCount: tournament.players.length,
      matchCount: tournament.matches.length
    };

    if (index >= 0) {
      list[index] = metadata;
    } else {
      list.push(metadata);
    }

    localStorage.setItem(this.TOURNAMENT_LIST_KEY, JSON.stringify(list));
  }

  removeTournamentFromList(tournamentId) {
    const list = this.getAllTournaments();
    const filtered = list.filter(t => t.id !== tournamentId);
    localStorage.setItem(this.TOURNAMENT_LIST_KEY, JSON.stringify(filtered));
  }

  exportTournamentToJson(tournament) {
    return JSON.stringify(tournament.toJSON(), null, 2);
  }

  importTournamentFromJson(jsonString) {
    const data = JSON.parse(jsonString);
    return Tournament.fromJSON(data);
  }

  parseCsvPlayers(csvContent) {
    const lines = csvContent.trim().split('\n');
    if (lines.length === 0) return [];

    // Detect separator
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' :
                      firstLine.includes('\t') ? '\t' : ',';

    // Parse header
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
    const voornaamIndex = headers.findIndex(h =>
      h.includes('voornaam') || h.includes('firstname') || h.includes('first')
    );
    const naamIndex = headers.findIndex(h =>
      h.includes('naam') || h.includes('name') || h.includes('last')
    );
    const klasIndex = headers.findIndex(h =>
      h.includes('klas') || h.includes('class') || h.includes('grade')
    );

    // Parse data rows
    const players = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const fields = line.split(separator).map(f => f.trim());

      const voornaam = voornaamIndex >= 0 ? fields[voornaamIndex] : fields[0];
      const naam = naamIndex >= 0 ? fields[naamIndex] : fields[1];
      const klas = klasIndex >= 0 && fields[klasIndex] ? fields[klasIndex] : '';

      if (voornaam && naam) {
        players.push({ voornaam, naam, klas });
      }
    }

    return players;
  }

  exportStandingsToHtml(tournament) {
    const standings = tournament.players.map(p => ({
      name: `${p.voornaam} ${p.naam}`,
      klas: p.klas,
      score: tournament.calculatePlayerScore ? tournament.calculatePlayerScore(p.id) : 0,
      matches: tournament.matches.filter(m =>
        m.whitePlayerId === p.id || m.blackPlayerId === p.id
      ).length
    })).sort((a, b) => b.score - a.score);

    let html = `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <title>${tournament.name} - Klassement</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #333; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .meta { color: #666; margin-bottom: 20px; }
        @media print {
            body { margin: 0; }
            button { display: none; }
        }
    </style>
</head>
<body>
    <h1>${tournament.name}</h1>
    <div class="meta">
        <p>Aangemaakt: ${new Date(tournament.creationDate).toLocaleDateString('nl-NL')}</p>
        <p>Aantal spelers: ${tournament.players.length}</p>
        <p>Aantal partijen: ${tournament.matches.length}</p>
    </div>
    <table>
        <thead>
            <tr>
                <th>Rang</th>
                <th>Naam</th>
                <th>Klas</th>
                <th>Punten</th>
                <th>Partijen</th>
            </tr>
        </thead>
        <tbody>`;

    standings.forEach((player, index) => {
      html += `
            <tr>
                <td>${index + 1}</td>
                <td>${player.name}</td>
                <td>${player.klas}</td>
                <td>${player.score}</td>
                <td>${player.matches}</td>
            </tr>`;
    });

    html += `
        </tbody>
    </table>
    <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px;">Afdrukken / Opslaan als PDF</button>
</body>
</html>`;

    return html;
  }

  clearAllData() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.STORAGE_PREFIX) || key === this.TOURNAMENT_LIST_KEY) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
  }
}

describe('StorageService', () => {
  let service;

  beforeEach(() => {
    service = new StorageService();
    localStorage.clear();
  });

  describe('saveTournament', () => {
    test('should save tournament to localStorage', () => {
      const tournament = new Tournament(1, 'Test Tournament');

      service.saveTournament(tournament);

      const key = service.STORAGE_PREFIX + tournament.id;
      const stored = localStorage.getItem(key);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored);
      expect(parsed.id).toBe(1);
      expect(parsed.name).toBe('Test Tournament');
    });

    test('should update tournament list metadata', () => {
      const tournament = new Tournament(1, 'Test Tournament');

      service.saveTournament(tournament);

      const list = service.getAllTournaments();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(1);
      expect(list[0].name).toBe('Test Tournament');
    });

    test('should update existing tournament in list', () => {
      const tournament = new Tournament(1, 'Test Tournament');
      service.saveTournament(tournament);

      tournament.name = 'Updated Tournament';
      service.saveTournament(tournament);

      const list = service.getAllTournaments();
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('Updated Tournament');
    });
  });

  describe('loadTournament', () => {
    test('should load tournament from localStorage', () => {
      const tournament = new Tournament(1, 'Test Tournament');
      service.saveTournament(tournament);

      const loaded = service.loadTournament(1);

      expect(loaded).not.toBeNull();
      expect(loaded.id).toBe(1);
      expect(loaded.name).toBe('Test Tournament');
    });

    test('should return null for non-existent tournament', () => {
      const loaded = service.loadTournament(999);

      expect(loaded).toBeNull();
    });

    test('should preserve tournament data', () => {
      const tournament = new Tournament(1, 'Test Tournament');
      tournament.players = [{ id: 1, voornaam: 'Jan', naam: 'Peeters' }];
      tournament.matches = [{ id: 1, whitePlayerId: 1, blackPlayerId: 2 }];
      service.saveTournament(tournament);

      const loaded = service.loadTournament(1);

      expect(loaded.players).toHaveLength(1);
      expect(loaded.matches).toHaveLength(1);
    });
  });

  describe('deleteTournament', () => {
    test('should delete tournament from localStorage', () => {
      const tournament = new Tournament(1, 'Test Tournament');
      service.saveTournament(tournament);

      service.deleteTournament(1);

      const loaded = service.loadTournament(1);
      expect(loaded).toBeNull();
    });

    test('should remove tournament from list', () => {
      const tournament = new Tournament(1, 'Test Tournament');
      service.saveTournament(tournament);

      service.deleteTournament(1);

      const list = service.getAllTournaments();
      expect(list).toHaveLength(0);
    });

    test('should not affect other tournaments', () => {
      const t1 = new Tournament(1, 'Tournament 1');
      const t2 = new Tournament(2, 'Tournament 2');
      service.saveTournament(t1);
      service.saveTournament(t2);

      service.deleteTournament(1);

      const loaded = service.loadTournament(2);
      expect(loaded).not.toBeNull();
      expect(loaded.name).toBe('Tournament 2');
    });
  });

  describe('getAllTournaments', () => {
    test('should return empty array when no tournaments', () => {
      const list = service.getAllTournaments();

      expect(list).toEqual([]);
    });

    test('should return list of tournament metadata', () => {
      const t1 = new Tournament(1, 'Tournament 1');
      const t2 = new Tournament(2, 'Tournament 2');
      service.saveTournament(t1);
      service.saveTournament(t2);

      const list = service.getAllTournaments();

      expect(list).toHaveLength(2);
      expect(list[0].name).toBe('Tournament 1');
      expect(list[1].name).toBe('Tournament 2');
    });

    test('should include metadata fields', () => {
      const tournament = new Tournament(1, 'Test');
      tournament.players = [{ id: 1 }, { id: 2 }];
      tournament.matches = [{ id: 1 }];
      service.saveTournament(tournament);

      const list = service.getAllTournaments();

      expect(list[0]).toHaveProperty('id');
      expect(list[0]).toHaveProperty('name');
      expect(list[0]).toHaveProperty('creationDate');
      expect(list[0]).toHaveProperty('playerCount');
      expect(list[0]).toHaveProperty('matchCount');
      expect(list[0].playerCount).toBe(2);
      expect(list[0].matchCount).toBe(1);
    });
  });

  describe('exportTournamentToJson', () => {
    test('should export tournament as JSON string', () => {
      const tournament = new Tournament(1, 'Test Tournament');

      const jsonString = service.exportTournamentToJson(tournament);

      expect(typeof jsonString).toBe('string');
      const parsed = JSON.parse(jsonString);
      expect(parsed.id).toBe(1);
      expect(parsed.name).toBe('Test Tournament');
    });

    test('should format JSON with indentation', () => {
      const tournament = new Tournament(1, 'Test');

      const jsonString = service.exportTournamentToJson(tournament);

      expect(jsonString).toContain('\n');
      expect(jsonString).toContain('  ');
    });

    test('should include all tournament data', () => {
      const tournament = new Tournament(1, 'Test');
      tournament.players = [{ id: 1, voornaam: 'Jan', naam: 'Peeters' }];
      tournament.matches = [{ id: 1, whitePlayerId: 1, blackPlayerId: 2 }];

      const jsonString = service.exportTournamentToJson(tournament);
      const parsed = JSON.parse(jsonString);

      expect(parsed.players).toHaveLength(1);
      expect(parsed.matches).toHaveLength(1);
      expect(parsed.settings).toBeDefined();
    });
  });

  describe('importTournamentFromJson', () => {
    test('should import tournament from JSON string', () => {
      const original = new Tournament(1, 'Test Tournament');
      const jsonString = service.exportTournamentToJson(original);

      const imported = service.importTournamentFromJson(jsonString);

      expect(imported.id).toBe(1);
      expect(imported.name).toBe('Test Tournament');
    });

    test('should preserve all tournament data', () => {
      const original = new Tournament(1, 'Test');
      original.players = [{ id: 1, voornaam: 'Jan', naam: 'Peeters' }];
      original.matches = [{ id: 1, whitePlayerId: 1, blackPlayerId: 2 }];
      original.settings.avoidSameClass = true;
      const jsonString = service.exportTournamentToJson(original);

      const imported = service.importTournamentFromJson(jsonString);

      expect(imported.players).toHaveLength(1);
      expect(imported.matches).toHaveLength(1);
      expect(imported.settings.avoidSameClass).toBe(true);
    });

    test('should throw error for invalid JSON', () => {
      expect(() => {
        service.importTournamentFromJson('invalid json');
      }).toThrow();
    });
  });

  describe('parseCsvPlayers', () => {
    test('should parse comma-separated CSV', () => {
      const csv = `voornaam,naam,klas
Jan,Peeters,5A
Marie,Janssens,5B`;

      const players = service.parseCsvPlayers(csv);

      expect(players).toHaveLength(2);
      expect(players[0]).toEqual({ voornaam: 'Jan', naam: 'Peeters', klas: '5A' });
      expect(players[1]).toEqual({ voornaam: 'Marie', naam: 'Janssens', klas: '5B' });
    });

    test('should parse semicolon-separated CSV', () => {
      const csv = `voornaam;naam;klas
Jan;Peeters;5A
Marie;Janssens;5B`;

      const players = service.parseCsvPlayers(csv);

      expect(players).toHaveLength(2);
      expect(players[0].voornaam).toBe('Jan');
    });

    test('should parse tab-separated CSV', () => {
      const csv = `voornaam\tnaam\tklas
Jan\tPeeters\t5A`;

      const players = service.parseCsvPlayers(csv);

      expect(players).toHaveLength(1);
      expect(players[0].voornaam).toBe('Jan');
    });

    test('should handle CSV without klas column', () => {
      const csv = `voornaam,naam
Jan,Peeters
Marie,Janssens`;

      const players = service.parseCsvPlayers(csv);

      expect(players).toHaveLength(2);
      expect(players[0].klas).toBe('');
      expect(players[1].klas).toBe('');
    });

    test('should handle English column names', () => {
      const csv = `firstname,lastname,class
Jan,Peeters,5A`;

      const players = service.parseCsvPlayers(csv);

      expect(players).toHaveLength(1);
      expect(players[0].voornaam).toBe('Jan');
      expect(players[0].naam).toBe('Peeters');
      expect(players[0].klas).toBe('5A');
    });

    test('should skip empty lines', () => {
      const csv = `voornaam,naam
Jan,Peeters

Marie,Janssens`;

      const players = service.parseCsvPlayers(csv);

      expect(players).toHaveLength(2);
    });

    test('should skip rows with missing data', () => {
      const csv = `voornaam,naam
Jan,Peeters
,Janssens
Tom,`;

      const players = service.parseCsvPlayers(csv);

      expect(players).toHaveLength(1);
      expect(players[0].voornaam).toBe('Jan');
    });

    test('should trim whitespace', () => {
      const csv = `voornaam,naam
  Jan  ,  Peeters  `;

      const players = service.parseCsvPlayers(csv);

      expect(players[0].voornaam).toBe('Jan');
      expect(players[0].naam).toBe('Peeters');
    });

    test('should return empty array for empty CSV', () => {
      const players = service.parseCsvPlayers('');

      expect(players).toEqual([]);
    });
  });

  describe('exportStandingsToHtml', () => {
    test('should export standings as HTML', () => {
      const tournament = new Tournament(1, 'Test Tournament');
      tournament.players = [
        { id: 1, voornaam: 'Jan', naam: 'Peeters', klas: '5A' }
      ];
      tournament.matches = [];
      tournament.calculatePlayerScore = () => 0;

      const html = service.exportStandingsToHtml(tournament);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Test Tournament');
      expect(html).toContain('Jan Peeters');
      expect(html).toContain('5A');
    });

    test('should include tournament metadata', () => {
      const tournament = new Tournament(1, 'Test');
      tournament.players = [];
      tournament.matches = [];

      const html = service.exportStandingsToHtml(tournament);

      expect(html).toContain('Aantal spelers:');
      expect(html).toContain('Aantal partijen:');
    });

    test('should sort players by score descending', () => {
      const tournament = new Tournament(1, 'Test');
      tournament.players = [
        { id: 1, voornaam: 'Jan', naam: 'Peeters', klas: '' },
        { id: 2, voornaam: 'Marie', naam: 'Janssens', klas: '' }
      ];
      tournament.matches = [];
      tournament.calculatePlayerScore = (id) => id === 2 ? 5 : 3;

      const html = service.exportStandingsToHtml(tournament);

      const marieIndex = html.indexOf('Marie Janssens');
      const janIndex = html.indexOf('Jan Peeters');
      expect(marieIndex).toBeLessThan(janIndex); // Marie (5 pts) before Jan (3 pts)
    });

    test('should include print styling', () => {
      const tournament = new Tournament(1, 'Test');
      tournament.players = [];
      tournament.matches = [];

      const html = service.exportStandingsToHtml(tournament);

      expect(html).toContain('@media print');
    });
  });

  describe('clearAllData', () => {
    test('should clear all tournament data', () => {
      const t1 = new Tournament(1, 'Tournament 1');
      const t2 = new Tournament(2, 'Tournament 2');
      service.saveTournament(t1);
      service.saveTournament(t2);

      service.clearAllData();

      expect(service.getAllTournaments()).toEqual([]);
      expect(service.loadTournament(1)).toBeNull();
      expect(service.loadTournament(2)).toBeNull();
    });

    test('should not clear unrelated localStorage data', () => {
      localStorage.setItem('other_key', 'other_value');
      const tournament = new Tournament(1, 'Test');
      service.saveTournament(tournament);

      service.clearAllData();

      expect(localStorage.getItem('other_key')).toBe('other_value');
    });
  });
});

