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

  getTournament() {
    return this.currentTournament;
  }
}

