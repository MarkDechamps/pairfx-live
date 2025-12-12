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

/**
 * Toggle CSV help visibility
 */
function toggleCsvHelp() {
    const helpContent = document.getElementById('csvHelpContent');
    if (helpContent.style.display === 'none') {
        helpContent.style.display = 'block';
    } else {
        helpContent.style.display = 'none';
    }
}

/**
 * Download example CSV file
 */
function downloadExampleCSV() {
    const csvContent = `Voornaam,Naam,Klas
Jan,Peeters,5A
Marie,Janssens,5B
Tom,Wouters,5A
Lisa,Claes,5B
Peter,Van den Berg,6A
Sophie,De Vries
Mark,Vermeulen,6A
Emma,Jacobs`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'voorbeeld-spelers.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Export for testing (Node.js only)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { app, toggleCsvHelp, downloadExampleCSV };
}

// Make functions globally accessible (Browser)
if (typeof window !== 'undefined') {
  window.app = app;
  window.toggleCsvHelp = toggleCsvHelp;
  window.downloadExampleCSV = downloadExampleCSV;
}
