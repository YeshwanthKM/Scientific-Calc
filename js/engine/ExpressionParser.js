import { CalculatorError } from '../errors/CalculatorError.js';

/**
 * ExpressionParser Class
 * Parses and evaluates mathematical expressions using a tokenized Shunting-Yard
 * and Reverse Polish Notation (RPN) algorithm.
 * Strictly routes all computational operations through the provided ScientificCalculator engine.
 */
export class ExpressionParser {
  /** @type {import('./ScientificCalculator.js').ScientificCalculator} */
  #calculator;

  /**
   * @param {import('./ScientificCalculator.js').ScientificCalculator} calculator
   */
  constructor(calculator) {
    if (!calculator) {
      throw new Error('ExpressionParser requires an instance of ScientificCalculator.');
    }
    this.#calculator = calculator;
  }

  /**
   * Token definitions and operator precedence
   */
  static PRECEDENCE = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
    '×': 2,
    '÷': 2,
    '%': 2,
    '^': 3 // Right-associative
  };

  static FUNCTIONS = new Set([
    'sin', 'cos', 'tan', 'sqrt', '√', 'log', 'log10', 'ln',
    'fact', 'factorial', 'abs', 'inv', 'sqr', 'cube'
  ]);

  static CONSTANTS = {
    'π': Math.PI,
    'pi': Math.PI,
    'PI': Math.PI,
    'e': Math.E,
    'E': Math.E
  };

  /**
   * Evaluates a mathematical expression string
   * @param {string} rawExpression
   * @returns {number}
   */
  evaluate(rawExpression) {
    if (!rawExpression || !rawExpression.trim()) {
      throw new CalculatorError('Empty expression.');
    }

    const sanitized = this.#sanitize(rawExpression);
    const tokens = this.#tokenize(sanitized);

    if (tokens.length === 0) {
      throw new CalculatorError('No valid mathematical tokens found.');
    }

    const rpn = this.#toRPN(tokens);
    const result = this.#evaluateRPN(rpn);

    // Register successful evaluation in the calculator's history
    this.#calculator.addRecord(rawExpression.trim(), result);

    return result;
  }

  /**
   * Sanitizes human-friendly symbols into parser-standard format
   * @param {string} expr
   * @returns {string}
   */
  #sanitize(expr) {
    let clean = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/–|—/g, '-')
      .replace(/ANS/gi, () => String(this.#calculator.getLastAnswer()))
      .replace(/π/g, ' PI ')
      .replace(/\bpi\b/gi, ' PI ')
      .replace(/\be\b/g, ' E ')
      .replace(/√/g, 'sqrt')
      .trim();

    return clean;
  }

  /**
   * Tokenizes mathematical string into numbers, operators, functions, and parentheses
   * @param {string} expr
   * @returns {Array<{type: string, value: string|number}>}
   */
  #tokenize(expr) {
    const tokens = [];
    let i = 0;
    const len = expr.length;

    while (i < len) {
      const char = expr[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Check numbers (including decimals)
      if (/[0-9]/.test(char) || (char === '.' && i + 1 < len && /[0-9]/.test(expr[i + 1]))) {
        let numStr = '';
        let dotCount = 0;
        while (i < len && (/[0-9]/.test(expr[i]) || expr[i] === '.')) {
          if (expr[i] === '.') {
            dotCount++;
            if (dotCount > 1) {
              throw new CalculatorError(`Invalid number format near '${numStr}.'`);
            }
          }
          numStr += expr[i];
          i++;
        }
        // Handle scientific notation e.g. 1.2e+3 or 1e5
        if (i < len && (expr[i] === 'e' || expr[i] === 'E') && (i + 1 < len && /[0-9+\-]/.test(expr[i + 1]))) {
          let expPart = expr[i];
          i++;
          if (expr[i] === '+' || expr[i] === '-') {
            expPart += expr[i];
            i++;
          }
          while (i < len && /[0-9]/.test(expr[i])) {
            expPart += expr[i];
            i++;
          }
          numStr += expPart;
        }

        tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
        continue;
      }

      // Check for Word tokens (functions or constants)
      if (/[a-zA-Z]/.test(char)) {
        let word = '';
        while (i < len && /[a-zA-Z0-9]/.test(expr[i])) {
          word += expr[i];
          i++;
        }

        const lowerWord = word.toLowerCase();

        if (word === 'PI' || lowerWord === 'pi') {
          tokens.push({ type: 'NUMBER', value: Math.PI });
        } else if (word === 'E' || lowerWord === 'e') {
          tokens.push({ type: 'NUMBER', value: Math.E });
        } else if (ExpressionParser.FUNCTIONS.has(lowerWord)) {
          tokens.push({ type: 'FUNCTION', value: lowerWord });
        } else {
          throw new CalculatorError(`Unknown function or identifier: '${word}'`);
        }
        continue;
      }

      // Factorial postfix operator '!'
      if (char === '!') {
        tokens.push({ type: 'POSTFIX', value: '!' });
        i++;
        continue;
      }

      // Binary operators and Parentheses
      if ('+-*/%^()'.includes(char)) {
        // Detect unary plus or minus
        if (char === '-' || char === '+') {
          const prev = tokens[tokens.length - 1];
          const isUnary = !prev || prev.type === 'OPERATOR' || (prev.type === 'PAREN' && prev.value === '(');
          if (isUnary) {
            tokens.push({ type: 'UNARY_OP', value: char });
            i++;
            continue;
          }
        }

        if (char === '(' || char === ')') {
          tokens.push({ type: 'PAREN', value: char });
        } else {
          tokens.push({ type: 'OPERATOR', value: char });
        }
        i++;
        continue;
      }

      throw new CalculatorError(`Unexpected character in expression: '${char}'`);
    }

    // Insert implicit multiplication tokens (e.g., 2(3) -> 2*(3), (2)(3) -> (2)*(3), 2sin(x) -> 2*sin(x))
    const refined = [];
    for (let j = 0; j < tokens.length; j++) {
      const curr = tokens[j];
      const next = tokens[j + 1];

      refined.push(curr);

      if (next) {
        const currCanMultiply = curr.type === 'NUMBER' || (curr.type === 'PAREN' && curr.value === ')') || curr.type === 'POSTFIX';
        const nextNeedsMultiply = next.type === 'NUMBER' || next.type === 'FUNCTION' || (next.type === 'PAREN' && next.value === '(');

        if (currCanMultiply && nextNeedsMultiply) {
          refined.push({ type: 'OPERATOR', value: '*' });
        }
      }
    }

    return refined;
  }

  /**
   * Converts token stream to Reverse Polish Notation (RPN) via Shunting-Yard
   * @param {Array} tokens
   * @returns {Array}
   */
  #toRPN(tokens) {
    const outputQueue = [];
    const opStack = [];

    for (const token of tokens) {
      if (token.type === 'NUMBER') {
        outputQueue.push(token);
      } else if (token.type === 'FUNCTION') {
        opStack.push(token);
      } else if (token.type === 'POSTFIX') {
        // Postfix operator has highest precedence and goes straight to queue
        outputQueue.push(token);
      } else if (token.type === 'UNARY_OP') {
        opStack.push({ type: 'UNARY_OP', value: token.value, precedence: 4 });
      } else if (token.type === 'OPERATOR') {
        const p1 = ExpressionParser.PRECEDENCE[token.value] || 0;
        const isRightAssoc = token.value === '^';

        while (opStack.length > 0) {
          const top = opStack[opStack.length - 1];
          if (top.type === 'PAREN' && top.value === '(') break;

          const p2 = top.type === 'UNARY_OP' ? top.precedence : (ExpressionParser.PRECEDENCE[top.value] || 0);

          if ((!isRightAssoc && p1 <= p2) || (isRightAssoc && p1 < p2)) {
            outputQueue.push(opStack.pop());
          } else {
            break;
          }
        }
        opStack.push(token);
      } else if (token.type === 'PAREN' && token.value === '(') {
        opStack.push(token);
      } else if (token.type === 'PAREN' && token.value === ')') {
        let foundOpen = false;
        while (opStack.length > 0) {
          const top = opStack.pop();
          if (top.type === 'PAREN' && top.value === '(') {
            foundOpen = true;
            break;
          }
          outputQueue.push(top);
        }

        if (!foundOpen) {
          throw new CalculatorError('Mismatched parentheses: unexpected closing parenthesis.');
        }

        // If top of stack is a function, pop it to output queue
        if (opStack.length > 0 && opStack[opStack.length - 1].type === 'FUNCTION') {
          outputQueue.push(opStack.pop());
        }
      }
    }

    while (opStack.length > 0) {
      const top = opStack.pop();
      if (top.type === 'PAREN') {
        throw new CalculatorError('Mismatched parentheses: unclosed open parenthesis.');
      }
      outputQueue.push(top);
    }

    return outputQueue;
  }

  /**
   * Evaluates Reverse Polish Notation stack
   * Dispatches operations through ScientificCalculator
   * @param {Array} rpn
   * @returns {number}
   */
  #evaluateRPN(rpn) {
    const stack = [];

    for (const token of rpn) {
      if (token.type === 'NUMBER') {
        stack.push(token.value);
      } else if (token.type === 'POSTFIX') {
        if (stack.length < 1) {
          throw new CalculatorError("Operator '!' requires an operand.");
        }
        const val = stack.pop();
        // Route through ScientificCalculator unary evaluation
        const res = this.#calculator.calculateUnary('fact', val, false);
        stack.push(res);
      } else if (token.type === 'UNARY_OP') {
        if (stack.length < 1) {
          throw new CalculatorError(`Unary operator '${token.value}' missing operand.`);
        }
        const val = stack.pop();
        const res = token.value === '-' ? -val : val;
        stack.push(res);
      } else if (token.type === 'FUNCTION') {
        if (stack.length < 1) {
          throw new CalculatorError(`Function '${token.value}' missing required argument.`);
        }
        const arg = stack.pop();
        // Route through ScientificCalculator unary evaluation
        const res = this.#calculator.calculateUnary(token.value, arg, false);
        stack.push(res);
      } else if (token.type === 'OPERATOR') {
        if (stack.length < 2) {
          throw new CalculatorError(`Operator '${token.value}' requires two operands.`);
        }
        const b = stack.pop();
        const a = stack.pop();
        // Route through ScientificCalculator binary evaluation
        const res = this.#calculator.calculateBinary(token.value, a, b, false);
        stack.push(res);
      }
    }

    if (stack.length !== 1) {
      throw new CalculatorError('Malformed mathematical expression.');
    }

    return stack[0];
  }
}
