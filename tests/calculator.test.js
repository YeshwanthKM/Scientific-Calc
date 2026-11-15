import { AngleMode } from '../js/enums/AngleMode.js';
import { CalculatorError } from '../js/errors/CalculatorError.js';
import { CalculationRecord } from '../js/models/CalculationRecord.js';
import { ScientificCalculator } from '../js/engine/ScientificCalculator.js';
import { ExpressionParser } from '../js/engine/ExpressionParser.js';

console.log('--- RUNNING SCIENTIFIC CALCULATOR OOP TEST SUITE ---\n');

let passedCount = 0;
let totalCount = 0;

function assert(condition, testName) {
  totalCount++;
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

function assertThrows(fn, expectedSubstring, testName) {
  totalCount++;
  try {
    fn();
    console.error(`❌ FAIL: ${testName} (Expected error containing "${expectedSubstring}", but no error thrown)`);
    process.exitCode = 1;
  } catch (err) {
    if (err instanceof CalculatorError && err.message.includes(expectedSubstring)) {
      console.log(`✅ PASS: ${testName} -> Caught: "${err.message}"`);
      passedCount++;
    } else {
      console.error(`❌ FAIL: ${testName} (Expected CalculatorError with "${expectedSubstring}", got "${err.message}")`);
      process.exitCode = 1;
    }
  }
}

// 1. AngleMode Tests
assert(AngleMode.DEGREE === 'DEGREE', 'AngleMode has DEGREE');
assert(AngleMode.RADIAN === 'RADIAN', 'AngleMode has RADIAN');
assert(AngleMode.toggle(AngleMode.DEGREE) === AngleMode.RADIAN, 'AngleMode toggle DEGREE -> RADIAN');
assert(AngleMode.toggle(AngleMode.RADIAN) === AngleMode.DEGREE, 'AngleMode toggle RADIAN -> DEGREE');

// 2. CalculationRecord Tests
CalculationRecord.resetCounter(100);
const r1 = new CalculationRecord('25.5 * 4', 102.0);
assert(r1.getId() === 101, 'CalculationRecord ID starts at 101');
assert(r1.getExpression() === '25.5 * 4', 'CalculationRecord expression matches');
assert(r1.getResult() === 102, 'CalculationRecord result matches');
assert(r1.toString().includes('ID: 101 | 25.5 * 4 = 102.000000'), 'CalculationRecord toString matches sample output format');

const r2 = new CalculationRecord('2 ^ 10', 1024.0);
assert(r2.getId() === 102, 'CalculationRecord ID auto-increments to 102');

// 3. ScientificCalculator Core Engine Tests
const calc = new ScientificCalculator();
calc.clearHistory();

// Basic Arithmetic
assert(calc.calculateBinary('+', 15, 27, false) === 42, 'Addition 15 + 27 = 42');
assert(calc.calculateBinary('-', 100, 35, false) === 65, 'Subtraction 100 - 35 = 65');
assert(calc.calculateBinary('*', 25.5, 4, false) === 102, 'Multiplication 25.5 * 4 = 102');
assert(calc.calculateBinary('/', 50, 4, false) === 12.5, 'Division 50 / 4 = 12.5');
assert(calc.calculateBinary('%', 17, 5, false) === 2, 'Modulo 17 % 5 = 2');
assert(calc.calculateBinary('^', 2, 10, false) === 1024, 'Power 2 ^ 10 = 1024');

// Trigonometry in DEGREE Mode
calc.setMode(AngleMode.DEGREE);
assert(calc.calculateUnary('sin', 90, false) === 1, 'sin(90 deg) = 1');
assert(Math.abs(calc.calculateUnary('cos', 60, false) - 0.5) < 1e-10, 'cos(60 deg) = 0.5');
assert(Math.abs(calc.calculateUnary('tan', 45, false) - 1) < 1e-10, 'tan(45 deg) = 1');

// Mode Switch to RADIAN
calc.setMode(AngleMode.RADIAN);
assert(Math.abs(calc.calculateUnary('sin', Math.PI / 2, false) - 1) < 1e-10, 'sin(pi/2 rad) = 1');
assert(Math.abs(calc.calculateUnary('cos', Math.PI, false) - (-1)) < 1e-10, 'cos(pi rad) = -1');

// Roots & Factorial
assert(calc.calculateUnary('sqrt', 144, false) === 12, 'sqrt(144) = 12');
assert(calc.calculateUnary('fact', 5, false) === 120, 'fact(5) = 120');
assert(calc.calculateUnary('fact', 0, false) === 1, 'fact(0) = 1');

// Logarithms
assert(calc.calculateUnary('log', 1000, false) === 3, 'log10(1000) = 3');
assert(Math.abs(calc.calculateUnary('ln', Math.E, false) - 1) < 1e-10, 'ln(e) = 1');

// Exception Checks Matching Java Specifications
assertThrows(() => calc.calculateBinary('/', 50, 0, false), 'Division by zero is undefined', 'Division by zero error');
assertThrows(() => calc.calculateBinary('%', 10, 0, false), 'Modulo by zero is undefined', 'Modulo by zero error');
assertThrows(() => calc.calculateUnary('sqrt', -16, false), 'Cannot calculate square root of negative number', 'Square root of negative error');
assertThrows(() => calc.calculateUnary('log', -10, false), 'log10 is undefined for values <= 0', 'log10 negative value error');
assertThrows(() => calc.calculateUnary('log', 0, false), 'log10 is undefined for values <= 0', 'log10 zero error');
assertThrows(() => calc.calculateUnary('ln', -5, false), 'Natural log ln is undefined for values <= 0', 'ln negative value error');
assertThrows(() => calc.calculateUnary('fact', -4, false), 'Factorial is only defined for non-negative integers', 'Factorial negative error');
assertThrows(() => calc.calculateUnary('fact', 3.7, false), 'Factorial is only defined for non-negative integers', 'Factorial non-integer error');

// Tan 90 deg undefined check
calc.setMode(AngleMode.DEGREE);
assertThrows(() => calc.calculateUnary('tan', 90, false), 'tan is undefined at 90 degrees', 'tan(90) in degrees error');
assertThrows(() => calc.calculateUnary('tan', 270, false), 'tan is undefined at 270 degrees', 'tan(270) in degrees error');

// 4. ExpressionParser Complex Evaluation Tests
const parser = new ExpressionParser(calc);

assert(parser.evaluate('25.5 * 4') === 102, 'Parser: 25.5 * 4 = 102');
assert(parser.evaluate('2 ^ 10') === 1024, 'Parser: 2 ^ 10 = 1024');
assert(parser.evaluate('(10 + 20) / 5') === 6, 'Parser: (10 + 20) / 5 = 6');
assert(parser.evaluate('sqrt(144) + fact(5)') === 132, 'Parser: sqrt(144) + fact(5) = 132');
assert(parser.evaluate('5!') === 120, 'Parser postfix: 5! = 120');
assert(parser.evaluate('sin(90) + cos(0)') === 2, 'Parser: sin(90) + cos(0) = 2 in DEG');
assert(parser.evaluate('3 + 4 * 2 / (1 - 5)^2') === 3.5, 'Parser precedence: 3 + 4 * 2 / (1 - 5)^2 = 3.5');

// ANS & Parentheses implicit multiplication
assert(parser.evaluate('2(3 + 4)') === 14, 'Parser implicit multiplication: 2(3 + 4) = 14');

// Parser Error propagation
assertThrows(() => parser.evaluate('100 / (5 - 5)'), 'Division by zero is undefined', 'Parser catches division by zero');
assertThrows(() => parser.evaluate('sqrt(4 - 20)'), 'Cannot calculate square root of negative number', 'Parser catches negative sqrt');
assertThrows(() => parser.evaluate('((10 + 2)'), 'unclosed open parenthesis', 'Parser catches unclosed parenthesis');

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passedCount} / ${totalCount} PASSED`);
console.log(`========================================\n`);
