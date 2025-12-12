/**
 * PlayerManager
 * Handles player list and player CRUD operations UI
 */
class PlayerManager {
  constructor(tournamentManager, storageService) {
    this.tournamentManager = tournamentManager;
    this.storageService = storageService;
    this.editingPlayerId = null;
    this.initEventListeners();
  }

  initEventListeners() {
    // Add player button
    document.getElementById('btn-add-player')?.addEventListener('click', () => {
      this.showPlayerModal();
    });

    // Import CSV
    document.getElementById('btn-import-players')?.addEventListener('click', () => {
      document.getElementById('file-import-players').click();
    });

    document.getElementById('file-import-players')?.addEventListener('change', (e) => {
      this.handleCsvImport(e);
    });

    // Player modal
    document.getElementById('btn-save-player')?.addEventListener('click', () => {
      this.savePlayer();
    });

    document.getElementById('btn-cancel-player')?.addEventListener('click', () => {
      this.hidePlayerModal();
    });

    document.getElementById('btn-close-player-modal')?.addEventListener('click', () => {
      this.hidePlayerModal();
    });

    // History modal
    document.getElementById('btn-close-history')?.addEventListener('click', () => {
      this.hideHistoryModal();
    });

    document.getElementById('btn-close-history-modal')?.addEventListener('click', () => {
      this.hideHistoryModal();
    });

    // Listen for tournament events
    window.addEventListener('tournamentLoaded', () => this.render());
    window.addEventListener('tournamentUpdated', () => this.render());
  }

  render() {
    const tournament = this.tournamentManager.getTournament();
    if (!tournament) return;

    const container = document.getElementById('player-list');

    if (tournament.players.length === 0) {
      container.innerHTML = '<p class="empty-message">Geen spelers. Voeg spelers toe.</p>';
      return;
    }

    // Sort players by score (descending)
    const sortedPlayers = [...tournament.players].sort((a, b) => {
      const scoreA = tournament.calculatePlayerScore(a.id);
      const scoreB = tournament.calculatePlayerScore(b.id);
      return scoreB - scoreA;
    });

    container.innerHTML = sortedPlayers.map((player, index) => {
      const score = tournament.calculatePlayerScore(player.id);
      const displayValue = tournament.settings.displayMode === 'percentage'
        ? tournament.calculatePlayerPercentage(player.id).toFixed(0) + '%'
        : score.toString();

      return `
        <div class="player-item ${player.afwezig ? 'absent' : ''}" data-id="${player.id}">
          <div class="player-rank">${index + 1}</div>
          <div class="player-info">
            <div class="player-name">${player.getFullName()}</div>
            ${player.klas ? `<div class="player-class">${player.klas}</div>` : ''}
          </div>
          <div class="player-score">${displayValue}</div>
          <div class="player-actions">
            <button class="btn-icon" onclick="app.playerManager.showHistory(${player.id})" title="Partijgeschiedenis">📊</button>
            <button class="btn-icon" onclick="app.playerManager.editPlayer(${player.id})" title="Bewerken">✏️</button>
            <button class="btn-icon" onclick="app.playerManager.toggleAbsent(${player.id})" title="Afwezig toggle">${player.afwezig ? '✓' : '✗'}</button>
            <button class="btn-icon btn-danger" onclick="app.playerManager.deletePlayer(${player.id})" title="Verwijderen">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  showPlayerModal(playerId = null) {
    this.editingPlayerId = playerId;

    if (playerId) {
      const tournament = this.tournamentManager.getTournament();
      const player = tournament.getPlayer(playerId);
      if (!player) return;

      document.getElementById('player-modal-title').textContent = 'Speler Bewerken';
      document.getElementById('player-voornaam').value = player.voornaam;
      document.getElementById('player-naam').value = player.naam;
      document.getElementById('player-klas').value = player.klas;
    } else {
      document.getElementById('player-modal-title').textContent = 'Speler Toevoegen';
      document.getElementById('player-voornaam').value = '';
      document.getElementById('player-naam').value = '';
      document.getElementById('player-klas').value = '';
    }

    document.getElementById('player-modal').style.display = 'flex';
    document.getElementById('player-voornaam').focus();
  }

  hidePlayerModal() {
    document.getElementById('player-modal').style.display = 'none';
    this.editingPlayerId = null;
  }

  savePlayer() {
    const voornaam = document.getElementById('player-voornaam').value.trim();
    const naam = document.getElementById('player-naam').value.trim();
    const klas = document.getElementById('player-klas').value.trim();

    if (!voornaam || !naam) {
      alert('Voornaam en naam zijn verplicht');
      return;
    }

    const tournament = this.tournamentManager.getTournament();

    if (this.editingPlayerId) {
      // Edit existing player
      const player = tournament.getPlayer(this.editingPlayerId);
      if (player) {
        player.voornaam = voornaam;
        player.naam = naam;
        player.klas = klas;
      }
    } else {
      // Add new player
      tournament.addPlayer(voornaam, naam, klas);
    }

    this.tournamentManager.saveTournament();
    this.hidePlayerModal();
    this.render();

    window.dispatchEvent(new CustomEvent('playersUpdated'));
  }

  editPlayer(playerId) {
    this.showPlayerModal(playerId);
  }

  deletePlayer(playerId) {
    if (!confirm('Weet je zeker dat je deze speler wilt verwijderen? Alle partijen worden ook verwijderd.')) {
      return;
    }

    const tournament = this.tournamentManager.getTournament();
    tournament.removePlayer(playerId);
    this.tournamentManager.saveTournament();
    this.render();

    window.dispatchEvent(new CustomEvent('playersUpdated'));
  }

  toggleAbsent(playerId) {
    const tournament = this.tournamentManager.getTournament();
    const player = tournament.getPlayer(playerId);
    if (!player) return;

    player.afwezig = !player.afwezig;
    this.tournamentManager.saveTournament();
    this.render();

    window.dispatchEvent(new CustomEvent('playersUpdated'));
  }

  handleCsvImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const players = this.storageService.parseCsvPlayers(e.target.result);

        if (players.length === 0) {
          alert('Geen geldige spelers gevonden in CSV');
          return;
        }

        const tournament = this.tournamentManager.getTournament();
        players.forEach(p => {
          tournament.addPlayer(p.voornaam, p.naam, p.klas);
        });

        this.tournamentManager.saveTournament();
        this.render();

        window.dispatchEvent(new CustomEvent('playersUpdated'));
        alert(`${players.length} speler(s) geïmporteerd`);
      } catch (error) {
        alert('Fout bij importeren CSV: ' + error.message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  showHistory(playerId) {
    const tournament = this.tournamentManager.getTournament();
    const player = tournament.getPlayer(playerId);
    if (!player) return;

    const matches = tournament.getPlayerMatches(playerId);

    document.getElementById('history-modal-title').textContent =
      `Partijgeschiedenis - ${player.getFullName()}`;

    const container = document.getElementById('history-list');

    if (matches.length === 0) {
      container.innerHTML = '<p class="empty-message">Nog geen partijen gespeeld</p>';
    } else {
      container.innerHTML = matches.map(match => {
        const isWhite = match.whitePlayerId === playerId;
        const opponentId = isWhite ? match.blackPlayerId : match.whitePlayerId;
        const opponent = tournament.getPlayer(opponentId);
        const opponentName = opponent ? opponent.getFullName() : 'Onbekend';
        const color = isWhite ? '⚪ Wit' : '⚫ Zwart';
        const result = match.result || 'Actief';
        const date = match.lastPlayedDate
          ? new Date(match.lastPlayedDate).toLocaleString('nl-NL')
          : '-';

        return `
          <div class="history-item">
            <div class="history-round">Ronde ${match.round}</div>
            <div class="history-opponent">${color} vs ${opponentName}</div>
            <div class="history-result">${result}</div>
            <div class="history-date">${date}</div>
          </div>
        `;
      }).join('');
    }

    document.getElementById('history-modal').style.display = 'flex';
  }

  hideHistoryModal() {
    document.getElementById('history-modal').style.display = 'none';
  }
}

