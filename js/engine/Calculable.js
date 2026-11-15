/**
 * Calculable Abstract Contract (Interface)
 * Defines the core behavioral contract for binary and unary mathematical computations.
 * Mirrors Java: public interface Calculable
 */
export class Calculable {
  /**
   * Evaluates a binary operation between two operands.
   * @param {string} op - Binary operator (+, -, *, /, %, ^)
   * @param {number} a - First operand
   * @param {number} b - Second operand
   * @returns {number} Evaluated result
   * @throws {CalculatorError} On mathematical domain or operand violations
   */
  calculateBinary(op, a, b) {
    throw new Error("Abstract method 'calculateBinary(op, a, b)' must be implemented by subclass.");
  }

  /**
   * Evaluates a unary mathematical function on a single argument.
   * @param {string} fn - Unary function identifier (sin, cos, tan, sqrt, log, ln, fact, etc.)
   * @param {number} x - Input argument
   * @returns {number} Evaluated result
   * @throws {CalculatorError} On mathematical domain violations
   */
  calculateUnary(fn, x) {
    throw new Error("Abstract method 'calculateUnary(fn, x)' must be implemented by subclass.");
  }
}
