/**
 * Player Model
 * Represents a player in the tournament
 */
class Player {
  /**
   * Create a new player
   * @param {number} id - Unique player ID
   * @param {string} voornaam - First name
   * @param {string} naam - Last name
   * @param {string} klas - Class/grade (optional)
   */
  constructor(id, voornaam, naam, klas = '') {
    this.id = id;
    this.voornaam = voornaam;
    this.naam = naam;
    this.klas = klas;
    this.afwezig = false;
  }

  /**
   * Get full name of player
   * @returns {string} Full name (voornaam + naam)
   */
  getFullName() {
    return `${this.voornaam} ${this.naam}`;
  }

  /**
   * Serialize player to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      voornaam: this.voornaam,
      naam: this.naam,
      klas: this.klas,
      afwezig: this.afwezig
    };
  }

  /**
   * Deserialize player from JSON
   * @param {Object} json - JSON object
   * @returns {Player} Player instance
   */
  static fromJSON(json) {
    const player = new Player(json.id, json.voornaam, json.naam, json.klas);
    player.afwezig = json.afwezig || false;
    return player;
  }
}

