/**
 * Match Model
 * Represents a chess match between two players
 */
class Match {
  /**
   * Create a new match
   * @param {number} id - Unique match ID
   * @param {number} whitePlayerId - ID of player with white pieces
   * @param {number} blackPlayerId - ID of player with black pieces
   * @param {number} round - Round number
   */
  constructor(id, whitePlayerId, blackPlayerId, round) {
    this.id = id;
    this.whitePlayerId = whitePlayerId;
    this.blackPlayerId = blackPlayerId;
    this.round = round;
    this.result = null; // null = not played, '1-0', '0-1', '1/2-1/2'
    this.lastPlayedDate = null;
    this.isNew = true; // Flag for UI highlighting
    this.batchId = null; // For undo functionality
  }

  /**
   * Set the result of the match
   * @param {string} result - Result ('1-0', '0-1', '1/2-1/2')
   * @throws {Error} If result format is invalid
   */
  setResult(result) {
    if (!['1-0', '0-1', '1/2-1/2'].includes(result)) {
      throw new Error('Invalid result format');
    }
    this.result = result;
    this.lastPlayedDate = new Date().toISOString();
    this.isNew = false;
  }

  /**
   * Check if match is active (not yet played)
   * @returns {boolean} True if match is active
   */
  isActive() {
    return this.result === null;
  }

  /**
   * Check if match is finished
   * @returns {boolean} True if match is finished
   */
  isFinished() {
    return this.result !== null;
  }

  /**
   * Get score for white player
   * @returns {number} Score (1 for win, 0.5 for draw, 0 for loss)
   */
  getWhiteScore() {
    if (this.result === '1-0') return 1;
    if (this.result === '0-1') return 0;
    if (this.result === '1/2-1/2') return 0.5;
    return 0;
  }

  /**
   * Get score for black player
   * @returns {number} Score (1 for win, 0.5 for draw, 0 for loss)
   */
  getBlackScore() {
    if (this.result === '1-0') return 0;
    if (this.result === '0-1') return 1;
    if (this.result === '1/2-1/2') return 0.5;
    return 0;
  }

  /**
   * Serialize match to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      whitePlayerId: this.whitePlayerId,
      blackPlayerId: this.blackPlayerId,
      round: this.round,
      result: this.result,
      lastPlayedDate: this.lastPlayedDate,
      isNew: this.isNew,
      batchId: this.batchId
    };
  }

  /**
   * Deserialize match from JSON
   * @param {Object} json - JSON object
   * @returns {Match} Match instance
   */
  static fromJSON(json) {
    const match = new Match(json.id, json.whitePlayerId, json.blackPlayerId, json.round);
    match.result = json.result;
    match.lastPlayedDate = json.lastPlayedDate;
    match.isNew = json.isNew || false;
    match.batchId = json.batchId;
    return match;
  }
}

