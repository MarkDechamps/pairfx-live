/**
 * StorageService
 * Handles localStorage operations and data import/export
 */
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

    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' :
                      firstLine.includes('\t') ? '\t' : ',';

    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());

    // Strategy: Find exact column indices by checking each header
    const columnMapping = {};

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];

      // Check for voornaam/firstname columns
      if (header === 'voornaam' || header === 'firstname' || header === 'first name' || header === 'first') {
        columnMapping.voornaam = i;
      }
      // Check for naam/lastname columns (must be exact, not contain 'voornaam')
      else if (header === 'naam' || header === 'lastname' || header === 'last name' || header === 'surname') {
        columnMapping.naam = i;
      }
      // Check for generic 'name' (only if it's not 'firstname' or 'lastname')
      else if (header === 'name') {
        // If we don't have voornaam yet, this might be voornaam
        if (!columnMapping.voornaam) {
          columnMapping.voornaam = i;
        } else {
          columnMapping.naam = i;
        }
      }
      // Check for klas/class columns
      else if (header === 'klas' || header === 'class' || header === 'grade') {
        columnMapping.klas = i;
      }
    }

    // Fallback if columns not found
    if (columnMapping.voornaam === undefined) columnMapping.voornaam = 0;
    if (columnMapping.naam === undefined) columnMapping.naam = 1;

    const voornaamIndex = columnMapping.voornaam;
    const naamIndex = columnMapping.naam;
    const klasIndex = columnMapping.klas !== undefined ? columnMapping.klas : -1;

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
      score: tournament.calculatePlayerScore(p.id),
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
    <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">Afdrukken / Opslaan als PDF</button>
</body>
</html>`;

    return html;
  }

  clearAllData() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(this.STORAGE_PREFIX) || key === this.TOURNAMENT_LIST_KEY)) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
  }

  generateTournamentId() {
    const tournaments = this.getAllTournaments();
    if (tournaments.length === 0) return 1;
    return Math.max(...tournaments.map(t => t.id)) + 1;
  }
}

