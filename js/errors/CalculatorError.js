/**
 * CalculatorError Class
 * Custom checked error subclass representing mathematical domain violations and computational anomalies.
 * Mirrors Java: public class CalculatorException extends Exception { public CalculatorException(String message) { super("Math Error: " + message); } }
 */
export class CalculatorError extends Error {
  /**
   * @param {string} detail - The specific domain violation description
   */
  constructor(detail) {
    const formattedMessage = detail.startsWith('Math Error:') 
      ? detail 
      : `Math Error: ${detail}`;
    
    super(formattedMessage);
    
    this.name = 'CalculatorError';
    this.detail = detail.replace(/^Math Error:\s*/, '');
    this.timestamp = new Date().toISOString();

    // Preserve standard V8 stack trace capture if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CalculatorError);
    }
  }

  /**
   * String representation matching academic project output
   * @returns {string}
   */
  toString() {
    return this.message;
  }
}
