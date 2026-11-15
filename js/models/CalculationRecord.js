/**
 * CalculationRecord Class
 * Encapsulates calculation session metadata including auto-incremented sequence ID,
 * expression string, numerical result, and formatted timestamp.
 * Mirrors Java: CalculationRecord.java
 */
export class CalculationRecord {
  /**
   * Static auto-incrementing sequence counter starting at 100
   * The first created record receives ID 101.
   * @type {number}
   */
  static #counter = 100;

  /** @type {number} */
  #id;

  /** @type {string} */
  #expression;

  /** @type {number} */
  #result;

  /** @type {string} */
  #timestamp;

  /**
   * Creates an immutable audit record for an evaluated mathematical expression.
   * @param {string} expression - The mathematical expression evaluated
   * @param {number} result - The evaluated scalar result
   * @param {string} [customTimestamp] - Optional explicit timestamp
   */
  constructor(expression, result, customTimestamp = null) {
    this.#id = ++CalculationRecord.#counter;
    this.#expression = String(expression).trim();
    this.#result = Number(result);
    this.#timestamp = customTimestamp || CalculationRecord.generateTimestamp();
  }

  /**
   * Generates a timestamp string matching standard format "yyyy-MM-dd HH:mm:ss"
   * @returns {string}
   */
  static generateTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = now.getFullYear();
    const MM = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const HH = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
  }

  /**
   * Resets counter back to 100 (useful for testing and session clears)
   */
  static resetCounter(val = 100) {
    CalculationRecord.#counter = val;
  }

  /**
   * Gets current global counter value
   * @returns {number}
   */
  static getCounter() {
    return CalculationRecord.#counter;
  }

  // Encapsulated Getters
  getId() {
    return this.#id;
  }

  getExpression() {
    return this.#expression;
  }

  getResult() {
    return this.#result;
  }

  getTimestamp() {
    return this.#timestamp;
  }

  /**
   * Returns result formatted to specific decimal places without trailing zeroes
   * @param {number} [decimals=6]
   * @returns {string}
   */
  getFormattedResult(decimals = 6) {
    if (Number.isNaN(this.#result)) return 'NaN';
    if (!Number.isFinite(this.#result)) return this.#result > 0 ? 'Infinity' : '-Infinity';

    // Check if integer
    if (Number.isInteger(this.#result) && Math.abs(this.#result) < 1e15) {
      return this.#result.toString();
    }

    // Format fixed decimals matching Java: String.format("%.6f", result)
    const fixed = this.#result.toFixed(decimals);
    // Strip unnecessary trailing zeroes if after decimal point, while keeping clean output
    return parseFloat(fixed).toString();
  }

  /**
   * Formats record matching the Java project paper specification:
   * String.format("[%s] ID: %d | %s = %.6f", timestamp, id, expression, result);
   * @returns {string}
   */
  toString() {
    const fixed6 = Number.isFinite(this.#result) ? this.#result.toFixed(6) : String(this.#result);
    return `[${this.#timestamp}] ID: ${this.#id} | ${this.#expression} = ${fixed6}`;
  }

  /**
   * Serializes record for persistence or data export
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.#id,
      expression: this.#expression,
      result: this.#result,
      timestamp: this.#timestamp
    };
  }
}
