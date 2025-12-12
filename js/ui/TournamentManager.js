/**
 * TournamentManager
 * Handles tournament selection and settings UI
 */
class TournamentManager {
  constructor(storageService) {
    this.storageService = storageService;
    this.currentTournament = null;
    this.initEventListeners();
  }

  initEventListeners() {
    // New tournament button
    document.getElementById('btn-new-tournament')?.addEventListener('click', () => {
      this.createNewTournament();
    });

    // Import JSON button
    document.getElementById('btn-import-tournament')?.addEventListener('click', () => {
      document.getElementById('file-import').click();
    });

    document.getElementById('file-import')?.addEventListener('change', (e) => {
      this.handleJsonImport(e);
    });

    // Back button
    document.getElementById('btn-back')?.addEventListener('click', () => {
      this.showTournamentSelection();
    });

    // Settings
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.showSettingsModal();
    });

    document.getElementById('btn-save-settings')?.addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('btn-cancel-settings')?.addEventListener('click', () => {
      this.hideSettingsModal();
    });

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this.hideSettingsModal();
    });

    // Export
    document.getElementById('btn-export')?.addEventListener('click', () => {
      this.exportTournamentJson();
    });

    document.getElementById('btn-export-standings')?.addEventListener('click', () => {
      this.exportStandingsHtml();
    });

    // Copy players modal
    document.getElementById('btn-create-with-players')?.addEventListener('click', () => {
      this.createTournamentWithPlayers();
    });

    document.getElementById('btn-cancel-copy-players')?.addEventListener('click', () => {
      this.closeCopyPlayersModal();
    });

    document.getElementById('btn-close-copy-players-modal')?.addEventListener('click', () => {
      this.closeCopyPlayersModal();
    });

    // Select all / deselect all buttons
    document.getElementById('btn-select-all-players')?.addEventListener('click', () => {
      document.querySelectorAll('.player-copy-checkbox').forEach(cb => cb.checked = true);
    });

    document.getElementById('btn-deselect-all-players')?.addEventListener('click', () => {
      document.querySelectorAll('.player-copy-checkbox').forEach(cb => cb.checked = false);
    });
  }

  createNewTournament() {
    const name = prompt('Toernooi naam:', 'Nieuw Toernooi');
    if (!name) return;

    const id = this.storageService.generateTournamentId();
    const tournament = new Tournament(id, name);
    this.storageService.saveTournament(tournament);
    this.loadTournament(id);
  }

  loadTournament(tournamentId) {
    this.currentTournament = this.storageService.loadTournament(tournamentId);
    if (!this.currentTournament) {
      alert('Toernooi niet gevonden');
      return;
    }

    this.showTournamentScreen();
    this.updateTournamentDisplay();

    // Trigger refresh of other managers
    window.dispatchEvent(new CustomEvent('tournamentLoaded', {
      detail: { tournament: this.currentTournament }
    }));
  }

  saveTournament() {
    if (this.currentTournament) {
      this.storageService.saveTournament(this.currentTournament);
    }
  }

  showTournamentSelection() {
    document.getElementById('tournament-selection-screen').style.display = 'block';
    document.getElementById('tournament-screen').style.display = 'none';
    this.currentTournament = null;
    this.renderTournamentList();
  }

  showTournamentScreen() {
    document.getElementById('tournament-selection-screen').style.display = 'none';
    document.getElementById('tournament-screen').style.display = 'block';
  }

  renderTournamentList() {
    const tournaments = this.storageService.getAllTournaments();
    const container = document.getElementById('tournament-list');

    if (tournaments.length === 0) {
      container.innerHTML = '<p class="empty-message">Geen toernooien. Maak een nieuw toernooi aan.</p>';
      return;
    }

    container.innerHTML = tournaments.map(t => `
      <div class="tournament-card" data-id="${t.id}">
        <h3>${t.name}</h3>
        <div class="tournament-meta">
          <span>📅 ${new Date(t.creationDate).toLocaleDateString('nl-NL')}</span>
          <span>👥 ${t.playerCount} spelers</span>
          <span>🎮 ${t.matchCount} partijen</span>
        </div>
        <div class="tournament-actions">
          <button class="btn btn-small btn-primary" onclick="app.tournamentManager.loadTournament(${t.id})">Open</button>
          <button class="btn btn-small btn-secondary" onclick="app.tournamentManager.showCopyPlayersModal(${t.id})" title="Nieuw toernooi met spelers van dit toernooi">📋 Kopieer</button>
          <button class="btn btn-small btn-danger" onclick="app.tournamentManager.deleteTournament(${t.id})">Verwijder</button>
        </div>
      </div>
    `).join('');
  }

  deleteTournament(tournamentId) {
    if (!confirm('Weet je zeker dat je dit toernooi wilt verwijderen?')) return;

    this.storageService.deleteTournament(tournamentId);
    this.renderTournamentList();
  }

  updateTournamentDisplay() {
    if (!this.currentTournament) return;

    document.getElementById('tournament-name').textContent = this.currentTournament.name;
  }

  showSettingsModal() {
    if (!this.currentTournament) return;

    document.getElementById('setting-tournament-name').value = this.currentTournament.name;
    document.getElementById('setting-tournament-type').value = this.currentTournament.settings.format;
    document.getElementById('setting-scoring-basis').value = this.currentTournament.settings.displayMode;
    document.getElementById('setting-constraint-x').value = this.currentTournament.settings.constraintX;
    document.getElementById('setting-constraint-y').value = this.currentTournament.settings.constraintY;
    document.getElementById('setting-class-constraint').checked = this.currentTournament.settings.avoidSameClass;

    document.getElementById('settings-modal').style.display = 'flex';
  }

  hideSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
  }

  saveSettings() {
    if (!this.currentTournament) return;

    this.currentTournament.name = document.getElementById('setting-tournament-name').value;
    this.currentTournament.settings.format = document.getElementById('setting-tournament-type').value;
    this.currentTournament.settings.displayMode = document.getElementById('setting-scoring-basis').value;
    this.currentTournament.settings.constraintX = parseInt(document.getElementById('setting-constraint-x').value);
    this.currentTournament.settings.constraintY = parseFloat(document.getElementById('setting-constraint-y').value);
    this.currentTournament.settings.avoidSameClass = document.getElementById('setting-class-constraint').checked;

    this.saveTournament();
    this.updateTournamentDisplay();
    this.hideSettingsModal();

    window.dispatchEvent(new CustomEvent('tournamentUpdated', {
      detail: { tournament: this.currentTournament }
    }));
  }

  handleJsonImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const tournament = this.storageService.importTournamentFromJson(e.target.result);
        tournament.id = this.storageService.generateTournamentId();
        this.storageService.saveTournament(tournament);
        this.loadTournament(tournament.id);
      } catch (error) {
        alert('Ongeldige JSON: ' + error.message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  exportTournamentJson() {
    if (!this.currentTournament) return;

    const json = this.storageService.exportTournamentToJson(this.currentTournament);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentTournament.name}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportStandingsHtml() {
    if (!this.currentTournament) return;

    const html = this.storageService.exportStandingsToHtml(this.currentTournament);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentTournament.name}_klassement.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  showCopyPlayersModal(sourceTournamentId) {
    const sourceTournament = this.storageService.loadTournament(sourceTournamentId);
    if (!sourceTournament || sourceTournament.players.length === 0) {
      alert('Dit toernooi heeft geen spelers om te kopiëren');
      return;
    }

    // Store source tournament ID
    this.copySourceTournamentId = sourceTournamentId;

    // Populate modal with players
    const playerListContainer = document.getElementById('copy-players-list');
    playerListContainer.innerHTML = sourceTournament.players.map(p => `
      <div class="copy-player-item">
        <label class="checkbox-label">
          <input type="checkbox" class="player-copy-checkbox" data-player-id="${p.id}" checked>
          <span>${p.getFullName()}${p.klas ? ` (${p.klas})` : ''}</span>
        </label>
      </div>
    `).join('');

    // Update modal title
    document.getElementById('copy-players-modal-title').textContent =
      `Nieuw toernooi maken met spelers van "${sourceTournament.name}"`;

    // Set default new tournament name
    document.getElementById('copy-tournament-name').value = `${sourceTournament.name} - Kopie`;

    // Show modal
    document.getElementById('copy-players-modal').style.display = 'flex';
  }

  createTournamentWithPlayers() {
    const newName = document.getElementById('copy-tournament-name').value.trim();
    if (!newName) {
      alert('Voer een naam in voor het nieuwe toernooi');
      return;
    }

    // Get selected player IDs
    const checkboxes = document.querySelectorAll('.player-copy-checkbox:checked');
    if (checkboxes.length === 0) {
      alert('Selecteer minstens 1 speler');
      return;
    }

    const selectedPlayerIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.playerId));

    // Load source tournament
    const sourceTournament = this.storageService.loadTournament(this.copySourceTournamentId);

    // Create new tournament
    const newId = this.storageService.generateTournamentId();
    const newTournament = new Tournament(newId, newName);

    // Copy selected players (without their match history)
    sourceTournament.players
      .filter(p => selectedPlayerIds.includes(p.id))
      .forEach(p => {
        newTournament.addPlayer(p.voornaam, p.naam, p.klas);
      });

    // Copy settings from source tournament
    newTournament.settings = { ...sourceTournament.settings };

    // Save and load the new tournament
    this.storageService.saveTournament(newTournament);
    this.closeCopyPlayersModal();
    this.loadTournament(newId);
  }

  closeCopyPlayersModal() {
    document.getElementById('copy-players-modal').style.display = 'none';
    this.copySourceTournamentId = null;
  }

  getTournament() {
    return this.currentTournament;
  }
}
