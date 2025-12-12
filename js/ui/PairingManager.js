/**
 * PairingManager
 * Handles available players and pairings UI
 */
class PairingManager {
  constructor(tournamentManager, pairingService) {
    this.tournamentManager = tournamentManager;
    this.pairingService = pairingService;
    this.selectedPlayers = new Set();
    this.initEventListeners();
  }

  initEventListeners() {
    // Pairing button
    document.getElementById('btn-pair-selected')?.addEventListener('click', () => {
      this.createPairings();
    });

    // Undo button
    document.getElementById('btn-undo-last-batch')?.addEventListener('click', () => {
      this.undoLastBatch();
    });

    // Filters
    document.getElementById('filter-available')?.addEventListener('input', () => {
      this.renderAvailablePlayers();
    });

    document.getElementById('filter-pairings')?.addEventListener('input', () => {
      this.renderPairings();
    });

    document.getElementById('filter-active-only')?.addEventListener('change', () => {
      this.renderPairings();
    });

    // Listen for events
    window.addEventListener('tournamentLoaded', () => this.render());
    window.addEventListener('tournamentUpdated', () => this.render());
    window.addEventListener('playersUpdated', () => this.render());
  }

  render() {
    this.renderAvailablePlayers();
    this.renderPairings();
  }

  renderAvailablePlayers() {
    const tournament = this.tournamentManager.getTournament();
    if (!tournament) return;

    const filter = document.getElementById('filter-available').value.toLowerCase();
    const available = this.pairingService.getAvailablePlayers(tournament);

    const filtered = available.filter(p => {
      const name = p.getFullName().toLowerCase();
      return name.includes(filter);
    });

    const container = document.getElementById('available-players-list');

    if (filtered.length === 0) {
      container.innerHTML = '<p class="empty-message">Geen beschikbare spelers</p>';
      return;
    }

    container.innerHTML = filtered.map(player => {
      const isSelected = this.selectedPlayers.has(player.id);
      const score = tournament.calculatePlayerScore(player.id);

      return `
        <div class="available-player ${isSelected ? 'selected' : ''}" 
             data-id="${player.id}"
             onclick="app.pairingManager.toggleSelection(${player.id})">
          <div class="player-name">${player.getFullName()}</div>
          <div class="player-details">
            ${player.klas ? `Klas: ${player.klas} | ` : ''}
            Score: ${score}
          </div>
        </div>
      `;
    }).join('');
  }

  renderPairings() {
    const tournament = this.tournamentManager.getTournament();
    if (!tournament) return;

    const filter = document.getElementById('filter-pairings').value.toLowerCase();
    const activeOnly = document.getElementById('filter-active-only').checked;

    let matches = [...tournament.matches];

    // Filter by active status
    if (activeOnly) {
      matches = matches.filter(m => m.isActive());
    }

    // Filter by name
    if (filter) {
      matches = matches.filter(m => {
        const white = tournament.getPlayer(m.whitePlayerId);
        const black = tournament.getPlayer(m.blackPlayerId);
        if (!white || !black) return false;

        const names = (white.getFullName() + black.getFullName()).toLowerCase();
        return names.includes(filter);
      });
    }

    const container = document.getElementById('pairings-list');

    if (matches.length === 0) {
      container.innerHTML = '<p class="empty-message">Geen paringen</p>';
      return;
    }

    // Reverse to show newest first
    container.innerHTML = matches.reverse().map(match => {
      const white = tournament.getPlayer(match.whitePlayerId);
      const black = tournament.getPlayer(match.blackPlayerId);

      if (!white || !black) return '';

      const isNew = match.isNew;
      const isActive = match.isActive();

      return `
        <div class="pairing ${isNew ? 'new' : ''} ${isActive ? 'active' : 'finished'}" 
             data-id="${match.id}">
          <div class="pairing-info">
            <div class="pairing-round">Ronde ${match.round}</div>
            <div class="pairing-players">
              <div class="pairing-white">⚪ ${white.getFullName()}</div>
              <div class="pairing-black">⚫ ${black.getFullName()}</div>
            </div>
          </div>
          ${isActive ? `
            <div class="pairing-results">
              <button class="btn-result" onclick="app.pairingManager.setResult(${match.id}, '1-0')">1-0</button>
              <button class="btn-result" onclick="app.pairingManager.setResult(${match.id}, '1/2-1/2')">½-½</button>
              <button class="btn-result" onclick="app.pairingManager.setResult(${match.id}, '0-1')">0-1</button>
            </div>
          ` : `
            <div class="pairing-result-display">${match.result}</div>
          `}
        </div>
      `;
    }).join('');
  }

  toggleSelection(playerId) {
    if (this.selectedPlayers.has(playerId)) {
      this.selectedPlayers.delete(playerId);
    } else {
      this.selectedPlayers.add(playerId);
    }
    this.renderAvailablePlayers();
  }

  createPairings() {
    const tournament = this.tournamentManager.getTournament();
    if (!tournament) return;

    const selectedIds = Array.from(this.selectedPlayers);

    if (selectedIds.length === 0) {
      // Pair all available players
      const pairings = this.pairingService.createAutomaticPairings(tournament);

      if (pairings.length === 0) {
        alert('Geen paringen mogelijk');
        return;
      }

      this.tournamentManager.saveTournament();
      this.selectedPlayers.clear();
      this.render();

      window.dispatchEvent(new CustomEvent('playersUpdated'));

    } else if (selectedIds.length === 2) {
      // Manual pairing of 2 selected players
      const match = this.pairingService.createManualPairing(
        tournament,
        selectedIds[0],
        selectedIds[1]
      );

      if (!match) {
        alert('Kan geen paring maken met geselecteerde spelers (niet beschikbaar)');
        return;
      }

      this.tournamentManager.saveTournament();
      this.selectedPlayers.clear();
      this.render();

      window.dispatchEvent(new CustomEvent('playersUpdated'));

    } else {
      // Pair only selected players
      const pairings = this.pairingService.createAutomaticPairings(tournament, selectedIds);

      if (pairings.length === 0) {
        alert('Geen paringen mogelijk met geselecteerde spelers');
        return;
      }

      this.tournamentManager.saveTournament();
      this.selectedPlayers.clear();
      this.render();

      window.dispatchEvent(new CustomEvent('playersUpdated'));
    }
  }

  setResult(matchId, result) {
    const tournament = this.tournamentManager.getTournament();
    if (!tournament) return;

    const match = tournament.matches.find(m => m.id === matchId);
    if (!match) return;

    try {
      match.setResult(result);
      this.tournamentManager.saveTournament();
      this.render();

      window.dispatchEvent(new CustomEvent('playersUpdated'));
    } catch (error) {
      alert('Fout bij opslaan resultaat: ' + error.message);
    }
  }

  undoLastBatch() {
    const tournament = this.tournamentManager.getTournament();
    if (!tournament) return;

    if (tournament.matches.length === 0) {
      alert('Geen paringen om ongedaan te maken');
      return;
    }

    // Find last batch
    const lastMatch = tournament.matches[tournament.matches.length - 1];
    const lastBatchId = lastMatch.batchId;

    if (!lastBatchId) {
      alert('Geen batch gevonden om ongedaan te maken');
      return;
    }

    if (!confirm('Laatste batch paringen ongedaan maken?')) return;

    // Remove all matches with this batchId
    tournament.matches = tournament.matches.filter(m => m.batchId !== lastBatchId);

    this.tournamentManager.saveTournament();
    this.render();

    window.dispatchEvent(new CustomEvent('playersUpdated'));
  }
}

