/**
 * AngleMode Enum-like Object
 * Represents allowable angular measurement units for trigonometric evaluations.
 * Mirrors Java: public enum AngleMode { DEGREE, RADIAN }
 */
export const AngleMode = Object.freeze({
  DEGREE: 'DEGREE',
  RADIAN: 'RADIAN',

  /**
   * Validates if a given mode string is a valid AngleMode
   * @param {string} mode
   * @returns {boolean}
   */
  isValid(mode) {
    return mode === this.DEGREE || mode === this.RADIAN;
  },

  /**
   * Returns all available modes
   * @returns {string[]}
   */
  values() {
    return [this.DEGREE, this.RADIAN];
  },

  /**
   * Toggles between DEGREE and RADIAN
   * @param {string} currentMode
   * @returns {string}
   */
  toggle(currentMode) {
    return currentMode === this.DEGREE ? this.RADIAN : this.DEGREE;
  }
});
