import { Calculable } from './Calculable.js';
import { AngleMode } from '../enums/AngleMode.js';
import { CalculatorError } from '../errors/CalculatorError.js';
import { CalculationRecord } from '../models/CalculationRecord.js';

/**
 * ScientificCalculator Class
 * Core computational engine implementing the Calculable interface.
 * Manages angular state, session calculation history, and memory registers.
 * Mirrors Java: ScientificCalculator.java
 */
export class ScientificCalculator extends Calculable {
  /** @type {string} */
  #mode = AngleMode.DEGREE;

  /** @type {CalculationRecord[]} */
  #history = [];

  /** @type {number} */
  #memory = 0;

  /** @type {number} */
  #lastAnswer = 0;

  constructor() {
    super();
  }

  // --- Encapsulation: Getters & Setters ---

  /**
   * Returns current AngleMode
   * @returns {string}
   */
  getMode() {
    return this.#mode;
  }

  /**
   * Sets current AngleMode with strict validation
   * @param {string} mode
   */
  setMode(mode) {
    if (!AngleMode.isValid(mode)) {
      throw new CalculatorError(`Invalid AngleMode: ${mode}. Must be DEGREE or RADIAN.`);
    }
    this.#mode = mode;
  }

  /**
   * Toggles between DEGREE and RADIAN mode
   * @returns {string} The newly active mode
   */
  toggleMode() {
    this.#mode = AngleMode.toggle(this.#mode);
    return this.#mode;
  }

  /**
   * Returns a defensive shallow clone of the calculation history collection
   * @returns {CalculationRecord[]}
   */
  getHistory() {
    return [...this.#history];
  }

  /**
   * Clears in-memory session calculation history
   */
  clearHistory() {
    this.#history = [];
  }

  /**
   * Adds an audit record to history directly (used by complex expression evaluator)
   * @param {string} expression
   * @param {number} result
   * @returns {CalculationRecord}
   */
  addRecord(expression, result) {
    const record = new CalculationRecord(expression, result);
    this.#history.push(record);
    this.#lastAnswer = result;
    return record;
  }

  /**
   * Gets previous evaluated answer (ANS)
   * @returns {number}
   */
  getLastAnswer() {
    return this.#lastAnswer;
  }

  /**
   * Sets previous evaluated answer
   * @param {number} val
   */
  setLastAnswer(val) {
    this.#lastAnswer = Number(val);
  }

  // --- Memory Register Operations ---

  /**
   * Clears the memory register (MC)
   */
  memoryClear() {
    this.#memory = 0;
  }

  /**
   * Recalls current value from memory register (MR)
   * @returns {number}
   */
  memoryRecall() {
    return this.#memory;
  }

  /**
   * Adds value to memory register (M+)
   * @param {number} val
   * @returns {number}
   */
  memoryAdd(val) {
    this.#memory += Number(val);
    return this.#memory;
  }

  /**
   * Subtracts value from memory register (M-)
   * @param {number} val
   * @returns {number}
   */
  memorySubtract(val) {
    this.#memory -= Number(val);
    return this.#memory;
  }

  /**
   * Checks if memory register has non-zero stored value
   * @returns {boolean}
   */
  hasMemory() {
    return Math.abs(this.#memory) > 1e-12;
  }

  // --- Calculable Interface Implementation ---

  /**
   * Evaluates binary operations (+, -, *, /, %, ^)
   * @override
   * @param {string} op - Binary operator
   * @param {number} a - First operand
   * @param {number} b - Second operand
   * @param {boolean} [recordInHistory=true] - Whether to log this operation to history
   * @returns {number}
   */
  calculateBinary(op, a, b, recordInHistory = true) {
    a = Number(a);
    b = Number(b);

    if (Number.isNaN(a) || Number.isNaN(b)) {
      throw new CalculatorError('Invalid operand provided.');
    }

    let res;

    switch (op) {
      case '+':
        res = a + b;
        break;

      case '-':
        res = a - b;
        break;

      case '*':
      case '×':
        res = a * b;
        break;

      case '/':
      case '÷':
        if (Math.abs(b) < 1e-12) {
          throw new CalculatorError('Division by zero is undefined.');
        }
        res = a / b;
        break;

      case '%':
        if (Math.abs(b) < 1e-12) {
          throw new CalculatorError('Modulo by zero is undefined.');
        }
        res = a % b;
        break;

      case '^':
        // Edge case: negative base with non-integer exponent yields complex number
        if (a < 0 && !Number.isInteger(b)) {
          throw new CalculatorError('Negative base with non-integer exponent yields a complex number.');
        }
        if (a === 0 && b < 0) {
          throw new CalculatorError('Division by zero is undefined.');
        }
        res = Math.pow(a, b);
        break;

      default:
        throw new CalculatorError(`Unknown binary operator: ${op}`);
    }

    // Clean small floating-point imprecisions (e.g. 0.1 + 0.2 = 0.30000000000000004)
    res = this.#cleanPrecision(res);

    if (recordInHistory) {
      const rec = new CalculationRecord(`${a} ${op} ${b}`, res);
      this.#history.push(rec);
      this.#lastAnswer = res;
    }

    return res;
  }

  /**
   * Evaluates unary functions (sin, cos, tan, sqrt, log, ln, fact, 1/x, abs, etc.)
   * @override
   * @param {string} fn - Unary function name
   * @param {number} x - Numerical argument
   * @param {boolean} [recordInHistory=true] - Whether to log this operation to history
   * @returns {number}
   */
  calculateUnary(fn, x, recordInHistory = true) {
    x = Number(x);

    if (Number.isNaN(x)) {
      throw new CalculatorError('Invalid numeric argument.');
    }

    // Convert degrees to radians if DEGREE mode is active
    const rad = (this.#mode === AngleMode.DEGREE) ? (x * Math.PI) / 180 : x;
    let res;

    switch (fn.toLowerCase()) {
      case 'sin': {
        const val = Math.sin(rad);
        // Correct known values e.g. sin(180°) = 0, sin(360°) = 0
        res = Math.abs(val) < 1e-12 ? 0 : (Math.abs(val - 1) < 1e-12 ? 1 : (Math.abs(val + 1) < 1e-12 ? -1 : val));
        break;
      }

      case 'cos': {
        const val = Math.cos(rad);
        // Correct known values e.g. cos(90°) = 0, cos(270°) = 0
        res = Math.abs(val) < 1e-12 ? 0 : (Math.abs(val - 1) < 1e-12 ? 1 : (Math.abs(val + 1) < 1e-12 ? -1 : val));
        break;
      }

      case 'tan': {
        if (this.#mode === AngleMode.DEGREE) {
          // Check for (90 + k*180) degrees
          const normalized = Math.abs(x) % 180;
          if (Math.abs(normalized - 90) < 1e-6) {
            throw new CalculatorError(`tan is undefined at ${x} degrees.`);
          }
        } else {
          // In radians, check when cos(rad) is ~ 0 (pi/2 + k*pi)
          if (Math.abs(Math.cos(rad)) < 1e-12) {
            throw new CalculatorError(`tan is undefined at ${x} radians.`);
          }
        }
        const val = Math.tan(rad);
        res = Math.abs(val) < 1e-12 ? 0 : val;
        break;
      }

      case 'sqrt':
      case '√': {
        if (x < 0) {
          throw new CalculatorError('Cannot calculate square root of negative number.');
        }
        res = Math.sqrt(x);
        break;
      }

      case 'log':
      case 'log10': {
        if (x <= 0) {
          throw new CalculatorError('log10 is undefined for values <= 0.');
        }
        res = Math.log10(x);
        break;
      }

      case 'ln': {
        if (x <= 0) {
          throw new CalculatorError('Natural log ln is undefined for values <= 0.');
        }
        res = Math.log(x);
        break;
      }

      case 'fact':
      case 'factorial':
      case '!': {
        if (x < 0 || !Number.isInteger(x) || x !== Math.floor(x)) {
          throw new CalculatorError('Factorial is only defined for non-negative integers.');
        }
        if (x > 170) {
          throw new CalculatorError('Factorial overflow for n > 170.');
        }
        res = this.#factorial(x);
        break;
      }

      case '1/x':
      case 'inv': {
        if (Math.abs(x) < 1e-12) {
          throw new CalculatorError('Division by zero is undefined.');
        }
        res = 1 / x;
        break;
      }

      case 'abs': {
        res = Math.abs(x);
        break;
      }

      case 'sqr':
      case 'x^2': {
        res = x * x;
        break;
      }

      case 'cube':
      case 'x^3': {
        res = x * x * x;
        break;
      }

      case 'neg':
      case '+/-': {
        res = -x;
        break;
      }

      default:
        throw new CalculatorError(`Unknown unary function: ${fn}`);
    }

    res = this.#cleanPrecision(res);

    if (recordInHistory) {
      const rec = new CalculationRecord(`${fn}(${x})`, res);
      this.#history.push(rec);
      this.#lastAnswer = res;
    }

    return res;
  }

  // --- Private Helpers ---

  /**
   * Computes integer factorial iteratively
   * @param {number} n
   * @returns {number}
   */
  #factorial(n) {
    if (n === 0 || n === 1) return 1;
    let fact = 1;
    for (let i = 2; i <= n; i++) {
      fact *= i;
    }
    return fact;
  }

  /**
   * Cleans IEEE-754 precision artifacts
   * @param {number} num
   * @returns {number}
   */
  #cleanPrecision(num) {
    if (!Number.isFinite(num)) return num;
    // Round within 12 decimal places if difference from nearest integer or round number is negligible
    const rounded = Math.round(num * 1e12) / 1e12;
    return Math.abs(num - rounded) < 1e-13 ? rounded : num;
  }
}
