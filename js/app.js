import { ScientificCalculator } from './engine/ScientificCalculator.js';
import { CalculatorUI } from './ui/CalculatorUI.js';
import { AngleMode } from './enums/AngleMode.js';
import { CalculatorError } from './errors/CalculatorError.js';
import { CalculationRecord } from './models/CalculationRecord.js';

/**
 * Application Bootstrap
 * Instantiates the OOP ScientificCalculator engine and binds the UI layer.
 */
document.addEventListener('DOMContentLoaded', () => {
  const calculatorEngine = new ScientificCalculator();
  const calculatorUI = new CalculatorUI(calculatorEngine);

  calculatorUI.init();

  // Expose engine instance on global window for educational inspection & debugging in console
  window.__CALC_ENGINE__ = calculatorEngine;
  window.__AngleMode__ = AngleMode;
  window.__CalculatorError__ = CalculatorError;
  window.__CalculationRecord__ = CalculationRecord;

  console.log(
    '%c🔬 Object-Oriented Scientific Calculator Initialized!',
    'color: #38bdf8; font-size: 14px; font-weight: bold;'
  );
  console.log(
    '%cOOP Architecture loaded: AngleMode (Enum), Calculable (Contract), ScientificCalculator (Engine), CalculationRecord (Model), CalculatorError (Custom Exception), ExpressionParser (Grammar), CalculatorUI (Presentation).',
    'color: #94a3b8; font-size: 12px;'
  );
});
