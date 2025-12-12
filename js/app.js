/**
 * PairFX - Main Application Entry Point
 * Initializes all services and UI managers
 */

// Global application object
const app = {};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎮 PairFX Application starting...');

  try {
    // Initialize services
    app.storageService = new StorageService();
    app.pairingService = new PairingService();

    // Initialize UI managers
    app.tournamentManager = new TournamentManager(app.storageService);
    app.playerManager = new PlayerManager(app.tournamentManager, app.storageService);
    app.pairingManager = new PairingManager(app.tournamentManager, app.pairingService);

    // Show tournament selection screen
    app.tournamentManager.showTournamentSelection();

    console.log('✅ PairFX Application loaded successfully');
  } catch (error) {
    console.error('❌ Error initializing PairFX:', error);
    alert('Fout bij starten applicatie: ' + error.message);
  }
});

// Close modals on outside click
window.addEventListener('click', (event) => {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
  }
});

// OLD CODE BELOW - REMOVED AND REPLACED BY UI MANAGERS
/*
function OLD_setupEventListeners() {
  // Tournament Selection
  document.getElementById('btn-new-tournament').addEventListener('click', createNewTournament);
  document.getElementById('btn-import-tournament').addEventListener('click', () => {
    document.getElementById('file-import').click();
  });
  document.getElementById('file-import').addEventListener('change', handleTournamentImport);

  // Tournament Management
  document.getElementById('btn-back').addEventListener('click', () => {
    showTournamentSelectionScreen();
  });
  document.getElementById('btn-settings').addEventListener('click', openSettingsModal);
  document.getElementById('btn-export').addEventListener('click', exportTournamentJson);
  document.getElementById('btn-export-standings').addEventListener('click', exportStandingsHtml);

  // Player Management
  document.getElementById('btn-add-player').addEventListener('click', () => openPlayerModal());
  document.getElementById('btn-import-players').addEventListener('click', () => {
    document.getElementById('file-import-players').click();
  });
  document.getElementById('file-import-players').addEventListener('change', handlePlayersImport);

  // Pairing
  document.getElementById('btn-pair-selected').addEventListener('click', createPairings);
  document.getElementById('btn-undo-last-batch').addEventListener('click', undoLastBatch);

  // Filters
  document.getElementById('filter-available').addEventListener('input', renderAvailablePlayers);
  document.getElementById('filter-pairings').addEventListener('input', renderPairings);
  document.getElementById('filter-active-only').addEventListener('change', renderPairings);

  // Settings Modal
  document.getElementById('btn-close-settings').addEventListener('click', closeSettingsModal);
  document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
  document.getElementById('btn-cancel-settings').addEventListener('click', closeSettingsModal);

  // Player Modal
  document.getElementById('btn-close-player-modal').addEventListener('click', closePlayerModal);
  document.getElementById('btn-save-player').addEventListener('click', savePlayer);
  document.getElementById('btn-cancel-player').addEventListener('click', closePlayerModal);

  // History Modal
  document.getElementById('btn-close-history-modal').addEventListener('click', closeHistoryModal);
  document.getElementById('btn-close-history').addEventListener('click', closeHistoryModal);

  // Click outside modal to close
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });
}

// ==================== SCREEN MANAGEMENT ====================

function showTournamentSelectionScreen() {
  document.getElementById('tournament-selection-screen').style.display = 'block';
  document.getElementById('tournament-screen').style.display = 'none';
  app.currentTournament = null;
  renderTournamentList();
}

function showTournamentScreen() {
  document.getElementById('tournament-selection-screen').style.display = 'none';
  document.getElementById('tournament-screen').style.display = 'block';
  document.getElementById('tournament-name').textContent = app.currentTournament.name;
  renderAll();
}

// ==================== TOURNAMENT OPERATIONS ====================

function createNewTournament() {
  const name = prompt('Toernooi naam:');
  if (!name) return;

  const id = app.storageService.generateTournamentId();
  app.currentTournament = new Tournament(id, name);
  app.storageService.saveTournament(app.currentTournament);
  showTournamentScreen();
}

function loadTournament(id) {
  app.currentTournament = app.storageService.loadTournament(id);
  if (app.currentTournament) {
    showTournamentScreen();
  } else {
    alert('Kan toernooi niet laden');
  }
}

function deleteTournament(id) {
  if (!confirm('Toernooi verwijderen?')) return;
  app.storageService.deleteTournament(id);
  renderTournamentList();
}

function handleTournamentImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const tournament = app.storageService.importTournamentFromJson(e.target.result);
      tournament.id = app.storageService.generateTournamentId();
      app.storageService.saveTournament(tournament);
      renderTournamentList();
      alert('Toernooi geïmporteerd!');
    } catch (error) {
      alert('Ongeldige JSON: ' + error.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function exportTournamentJson() {
  const json = app.storageService.exportTournamentToJson(app.currentTournament);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${app.currentTournament.name}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportStandingsHtml() {
  const html = app.storageService.exportStandingsToHtml(app.currentTournament);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${app.currentTournament.name}_klassement.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==================== PLAYER OPERATIONS ====================

let editingPlayerId = null;

function handlePlayersImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const players = app.storageService.parseCsvPlayers(e.target.result);
      players.forEach(p => {
        app.currentTournament.addPlayer(p.voornaam, p.naam, p.klas);
      });
      saveTournament();
      renderAll();
      alert(`${players.length} spelers geïmporteerd!`);
    } catch (error) {
      alert('Ongeldige CSV: ' + error.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function openPlayerModal(playerId = null) {
  editingPlayerId = playerId;
  const modal = document.getElementById('player-modal');
  const title = document.getElementById('player-modal-title');

  if (playerId) {
    const player = app.currentTournament.getPlayer(playerId);
    title.textContent = 'Speler Bewerken';
    document.getElementById('player-voornaam').value = player.voornaam;
    document.getElementById('player-naam').value = player.naam;
    document.getElementById('player-klas').value = player.klas;
  } else {
    title.textContent = 'Speler Toevoegen';
    document.getElementById('player-voornaam').value = '';
    document.getElementById('player-naam').value = '';
    document.getElementById('player-klas').value = '';
  }

  modal.style.display = 'block';
  document.getElementById('player-voornaam').focus();
}

function closePlayerModal() {
  document.getElementById('player-modal').style.display = 'none';
  editingPlayerId = null;
}

function savePlayer() {
  const voornaam = document.getElementById('player-voornaam').value.trim();
  const naam = document.getElementById('player-naam').value.trim();
  const klas = document.getElementById('player-klas').value.trim();

  if (!voornaam || !naam) {
    alert('Voornaam en naam zijn verplicht');
    return;
  }

  if (editingPlayerId) {
    const player = app.currentTournament.getPlayer(editingPlayerId);
    player.voornaam = voornaam;
    player.naam = naam;
    player.klas = klas;
  } else {
    app.currentTournament.addPlayer(voornaam, naam, klas);
  }

  saveTournament();
  renderAll();
  closePlayerModal();
}

function togglePlayerAbsent(playerId) {
  const player = app.currentTournament.getPlayer(playerId);
  player.afwezig = !player.afwezig;
  saveTournament();
  renderAll();
}

function deletePlayer(playerId) {
  if (!confirm('Speler verwijderen? Dit verwijdert ook alle partijen van deze speler.')) return;
  app.currentTournament.removePlayer(playerId);
  saveTournament();
  renderAll();
}

function showPlayerHistory(playerId) {
  const player = app.currentTournament.getPlayer(playerId);
  const matches = app.currentTournament.getPlayerMatches(playerId);

  document.getElementById('history-modal-title').textContent =
    `Partijgeschiedenis: ${player.getFullName()}`;

  const historyList = document.getElementById('history-list');
  if (matches.length === 0) {
    historyList.innerHTML = '<p class="empty-message">Nog geen partijen gespeeld</p>';
  } else {
    historyList.innerHTML = matches.map(m => {
      const isWhite = m.whitePlayerId === playerId;
      const opponent = app.currentTournament.getPlayer(
        isWhite ? m.blackPlayerId : m.whitePlayerId
      );
      const color = isWhite ? '⚪' : '⚫';
      const result = m.result || 'Actief';

      return `<div class="history-item">
        <span>${color} vs ${opponent.getFullName()}</span>
        <span class="result">${result}</span>
      </div>`;
    }).join('');
  }

  document.getElementById('history-modal').style.display = 'block';
}

function closeHistoryModal() {
  document.getElementById('history-modal').style.display = 'none';
}

// ==================== PAIRING OPERATIONS ====================

function createPairings() {
  const selectedIds = Array.from(app.selectedAvailablePlayers);

  if (selectedIds.length === 2) {
    // Manual pairing
    const match = app.pairingService.createManualPairing(
      app.currentTournament, selectedIds[0], selectedIds[1]
    );
    if (match) {
      saveTournament();
      app.selectedAvailablePlayers.clear();
      renderAll();
    } else {
      alert('Kan geen paring maken met geselecteerde spelers');
    }
  } else {
    // Automatic pairing
    const matches = app.pairingService.createAutomaticPairings(
      app.currentTournament, selectedIds
    );
    if (matches.length > 0) {
      saveTournament();
      app.selectedAvailablePlayers.clear();
      renderAll();
    } else {
      alert('Geen paringen mogelijk');
    }
  }
}

function setMatchResult(matchId, result) {
  const match = app.currentTournament.matches.find(m => m.id === matchId);
  if (match) {
    match.setResult(result);
    saveTournament();
    renderAll();
  }
}

function undoLastBatch() {
  const matches = app.currentTournament.matches;
  if (matches.length === 0) return;

  const lastBatchId = matches[matches.length - 1].batchId;
  if (!lastBatchId || !confirm('Laatste batch paringen ongedaan maken?')) return;

  app.currentTournament.matches = matches.filter(m => m.batchId !== lastBatchId);
  saveTournament();
  renderAll();
}

// ==================== SETTINGS ====================

function openSettingsModal() {
  const s = app.currentTournament.settings;
  document.getElementById('setting-tournament-name').value = app.currentTournament.name;
  document.getElementById('setting-tournament-type').value = s.format;
  document.getElementById('setting-scoring-basis').value = s.displayMode;
  document.getElementById('setting-constraint-x').value = s.constraintX;
  document.getElementById('setting-constraint-y').value = s.constraintY;
  document.getElementById('setting-class-constraint').checked = s.avoidSameClass;
  document.getElementById('settings-modal').style.display = 'block';
}

function closeSettingsModal() {
  document.getElementById('settings-modal').style.display = 'none';
}

function saveSettings() {
  app.currentTournament.name = document.getElementById('setting-tournament-name').value;
  const s = app.currentTournament.settings;
  s.format = document.getElementById('setting-tournament-type').value;
  s.displayMode = document.getElementById('setting-scoring-basis').value;
  s.constraintX = parseInt(document.getElementById('setting-constraint-x').value);
  s.constraintY = parseFloat(document.getElementById('setting-constraint-y').value);
  s.avoidSameClass = document.getElementById('setting-class-constraint').checked;

  saveTournament();
  document.getElementById('tournament-name').textContent = app.currentTournament.name;
  closeSettingsModal();
  renderAll();
}

// ==================== RENDERING ====================

function renderTournamentList() {
  const tournaments = app.storageService.getAllTournaments();
  const listEl = document.getElementById('tournament-list');

  if (tournaments.length === 0) {
    listEl.innerHTML = '<p class="empty-message">Geen toernooien. Maak een nieuw toernooi aan.</p>';
    return;
  }

  listEl.innerHTML = tournaments.map(t => `
    <div class="tournament-card">
      <div class="tournament-card-header">
        <h3>${t.name}</h3>
        <button onclick="deleteTournament(${t.id})" class="btn-delete">×</button>
      </div>
      <div class="tournament-card-body">
        <p>📅 ${new Date(t.creationDate).toLocaleDateString('nl-NL')}</p>
        <p>👥 ${t.playerCount} spelers | 🎮 ${t.matchCount} partijen</p>
      </div>
      <button onclick="loadTournament(${t.id})" class="btn btn-primary btn-block">Open</button>
    </div>
  `).join('');
}

function renderAll() {
  renderPlayerList();
  renderAvailablePlayers();
  renderPairings();
}

function renderPlayerList() {
  const listEl = document.getElementById('player-list');
  const players = [...app.currentTournament.players].sort((a, b) => {
    const scoreA = app.currentTournament.calculatePlayerScore(a.id);
    const scoreB = app.currentTournament.calculatePlayerScore(b.id);
    return scoreB - scoreA; // Highest first
  });

  if (players.length === 0) {
    listEl.innerHTML = '<p class="empty-message">Geen spelers. Voeg spelers toe.</p>';
    return;
  }

  listEl.innerHTML = players.map((p, index) => {
    const score = app.currentTournament.calculatePlayerScore(p.id);
    const displayScore = app.currentTournament.settings.displayMode === 'percentage'
      ? app.currentTournament.calculatePlayerPercentage(p.id).toFixed(1) + '%'
      : score;

    return `<div class="player-item ${p.afwezig ? 'absent' : ''}">
      <div class="player-rank">${index + 1}</div>
      <div class="player-info" ondblclick="openPlayerModal(${p.id})">
        <div class="player-name">${p.getFullName()}</div>
        <div class="player-details">${p.klas ? `Klas: ${p.klas} | ` : ''}${displayScore} punten</div>
      </div>
      <div class="player-actions">
        <button onclick="showPlayerHistory(${p.id})" class="btn-icon" title="Geschiedenis">📊</button>
        <button onclick="togglePlayerAbsent(${p.id})" class="btn-icon" title="Afwezig">${p.afwezig ? '✓' : '○'}</button>
        <button onclick="openPlayerModal(${p.id})" class="btn-icon" title="Bewerken">✎</button>
        <button onclick="deletePlayer(${p.id})" class="btn-icon" title="Verwijderen">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function renderAvailablePlayers() {
  const filter = document.getElementById('filter-available').value.toLowerCase();
  const available = app.pairingService.getAvailablePlayers(app.currentTournament)
    .filter(p => {
      const fullName = p.getFullName().toLowerCase();
      return fullName.includes(filter);
    });

  const listEl = document.getElementById('available-players-list');

  if (available.length === 0) {
    listEl.innerHTML = '<p class="empty-message">Geen beschikbare spelers</p>';
    return;
  }

  listEl.innerHTML = available.map(p => {
    const isSelected = app.selectedAvailablePlayers.has(p.id);
    return `<div class="available-player-item ${isSelected ? 'selected' : ''}" 
                 onclick="togglePlayerSelection(${p.id})">
      <div class="player-name">${p.getFullName()}</div>
      <div class="player-details">${p.klas || 'Geen klas'}</div>
    </div>`;
  }).join('');
}

function renderPairings() {
  const filter = document.getElementById('filter-pairings').value.toLowerCase();
  const activeOnly = document.getElementById('filter-active-only').checked;

  let matches = app.currentTournament.matches;
  if (activeOnly) {
    matches = matches.filter(m => m.isActive());
  }

  matches = matches.filter(m => {
    const white = app.currentTournament.getPlayer(m.whitePlayerId);
    const black = app.currentTournament.getPlayer(m.blackPlayerId);
    if (!white || !black) return false;
    const names = (white.getFullName() + black.getFullName()).toLowerCase();
    return names.includes(filter);
  });

  const listEl = document.getElementById('pairings-list');

  if (matches.length === 0) {
    listEl.innerHTML = '<p class="empty-message">Geen paringen</p>';
    return;
  }

  listEl.innerHTML = matches.reverse().map(m => {
    const white = app.currentTournament.getPlayer(m.whitePlayerId);
    const black = app.currentTournament.getPlayer(m.blackPlayerId);

    return `<div class="pairing-item ${m.isNew ? 'new' : ''} ${m.isActive() ? 'active' : 'finished'}">
      <div class="pairing-players">
        <div class="player-white">⚪ ${white.getFullName()}</div>
        <div class="player-black">⚫ ${black.getFullName()}</div>
      </div>
      ${m.isActive() ? `
        <div class="pairing-actions">
          <button onclick="setMatchResult(${m.id}, '1-0')" class="btn-result">1-0</button>
          <button onclick="setMatchResult(${m.id}, '1/2-1/2')" class="btn-result">½-½</button>
          <button onclick="setMatchResult(${m.id}, '0-1')" class="btn-result">0-1</button>
        </div>
      ` : `
        <div class="pairing-result">${m.result}</div>
      `}
    </div>`;
  }).join('');
}

// ==================== HELPERS ====================

function togglePlayerSelection(playerId) {
  if (app.selectedAvailablePlayers.has(playerId)) {
    app.selectedAvailablePlayers.delete(playerId);
  } else {
    app.selectedAvailablePlayers.add(playerId);
  }
  renderAvailablePlayers();
}

function saveTournament() {
  if (app.currentTournament) {
    app.storageService.saveTournament(app.currentTournament);
  }
}

// Make functions globally accessible for onclick handlers
window.loadTournament = loadTournament;
window.deleteTournament = deleteTournament;
window.openPlayerModal = openPlayerModal;
window.togglePlayerAbsent = togglePlayerAbsent;
window.deletePlayer = deletePlayer;
window.showPlayerHistory = showPlayerHistory;
window.setMatchResult = setMatchResult;
// window.togglePlayerSelection = togglePlayerSelection;
*/

