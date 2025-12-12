/**
 * Tournament Model
 * Main model for managing tournament data
 */
class Tournament {
  /**
   * Create a new tournament
   * @param {number} id - Unique tournament ID
   * @param {string} name - Tournament name
   */
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.players = [];
    this.matches = [];
    this.creationDate = new Date().toISOString();
    this.settings = {
      format: 'run-through', // Always run-through (flexible continuous pairing)
      displayMode: 'points', // 'points' or 'percentage'
      constraintX: 3, // Recent opponent constraint (rounds)
      constraintY: 3, // Point difference constraint
      avoidSameClass: false // Soft constraint for class pairing
    };
    this.nextPlayerId = 1;
    this.nextMatchId = 1;
  }

  /**
   * Add a new player to the tournament
   * @param {string} voornaam - First name (required)
   * @param {string} naam - Last name (optional)
   * @param {string} klas - Class (optional)
   * @returns {Player|null} The created player or null if duplicate
   */
  addPlayer(voornaam, naam = '', klas = '') {
    // Check for duplicates (same voornaam + naam combination)
    const normalizedVoornaam = voornaam.trim().toLowerCase();
    const normalizedNaam = (naam || '').trim().toLowerCase();

    const isDuplicate = this.players.some(p => {
      const pVoornaam = p.voornaam.trim().toLowerCase();
      const pNaam = (p.naam || '').trim().toLowerCase();
      return pVoornaam === normalizedVoornaam && pNaam === normalizedNaam;
    });

    if (isDuplicate) {
      return null; // Duplicate found, don't add
    }

    const player = new Player(this.nextPlayerId++, voornaam, naam || '', klas);
    this.players.push(player);
    return player;
  }

  /**
   * Remove a player from the tournament
   * Also removes all matches involving this player
   * @param {number} playerId - Player ID to remove
   */
  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
    this.matches = this.matches.filter(m =>
      m.whitePlayerId !== playerId && m.blackPlayerId !== playerId
    );
  }

  /**
   * Get a player by ID
   * @param {number} playerId - Player ID
   * @returns {Player|undefined} The player or undefined
   */
  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  /**
   * Add a new match to the tournament
   * @param {number} whitePlayerId - White player ID
   * @param {number} blackPlayerId - Black player ID
   * @param {number} round - Round number
   * @returns {Match} The created match
   */
  addMatch(whitePlayerId, blackPlayerId, round) {
    const match = new Match(this.nextMatchId++, whitePlayerId, blackPlayerId, round);
    this.matches.push(match);
    return match;
  }

  /**
   * Get all matches for a specific player
   * @param {number} playerId - Player ID
   * @returns {Match[]} Array of matches
   */
  getPlayerMatches(playerId) {
    return this.matches.filter(m =>
      m.whitePlayerId === playerId || m.blackPlayerId === playerId
    );
  }

  /**
   * Calculate total score for a player
   * @param {number} playerId - Player ID
   * @returns {number} Total score
   */
  calculatePlayerScore(playerId) {
    let score = 0;
    for (const match of this.matches) {
      if (!match.isFinished()) continue;

      if (match.whitePlayerId === playerId) {
        score += match.getWhiteScore();
      } else if (match.blackPlayerId === playerId) {
        score += match.getBlackScore();
      }
    }
    return score;
  }

  /**
   * Calculate percentage score for a player
   * @param {number} playerId - Player ID
   * @returns {number} Percentage (0-100)
   */
  calculatePlayerPercentage(playerId) {
    const finishedMatches = this.matches.filter(m =>
      m.isFinished() && (m.whitePlayerId === playerId || m.blackPlayerId === playerId)
    );

    if (finishedMatches.length === 0) return 0;

    const score = this.calculatePlayerScore(playerId);
    return (score / finishedMatches.length) * 100;
  }

  /**
   * Calculate color preference for a player
   * Used to balance white/black assignments
   * @param {number} playerId - Player ID
   * @returns {string} Preference ('should_be_white', 'should_be_black', 'prefers_white', 'prefers_black', 'neutral')
   */
  calculatePlayerColourPreference(playerId) {
    let whiteCount = 0;
    let blackCount = 0;

    for (const match of this.matches) {
      if (match.whitePlayerId === playerId) whiteCount++;
      if (match.blackPlayerId === playerId) blackCount++;
    }

    const difference = whiteCount - blackCount;

    if (difference >= 2) return 'should_be_black';
    if (difference <= -2) return 'should_be_white';
    if (difference === 1) return 'prefers_black';
    if (difference === -1) return 'prefers_white';
    return 'neutral';
  }

  /**
   * Get the current round number
   * @returns {number} Current round (1 if no matches)
   */
  getCurrentRound() {
    if (this.matches.length === 0) return 1;
    return Math.max(...this.matches.map(m => m.round));
  }

  /**
   * Serialize tournament to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      players: this.players.map(p => p.toJSON()),
      matches: this.matches.map(m => m.toJSON()),
      creationDate: this.creationDate,
      settings: this.settings,
      nextPlayerId: this.nextPlayerId,
      nextMatchId: this.nextMatchId
    };
  }

  /**
   * Deserialize tournament from JSON
   * @param {Object} json - JSON object
   * @returns {Tournament} Tournament instance
   */
  static fromJSON(json) {
    const tournament = new Tournament(json.id, json.name);
    tournament.players = json.players.map(p => Player.fromJSON(p));
    tournament.matches = json.matches.map(m => Match.fromJSON(m));
    tournament.creationDate = json.creationDate;
    tournament.settings = json.settings;
    tournament.nextPlayerId = json.nextPlayerId;
    tournament.nextMatchId = json.nextMatchId;
    return tournament;
  }
}

