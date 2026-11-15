import { AngleMode } from '../enums/AngleMode.js';
import { CalculatorError } from '../errors/CalculatorError.js';
import { ExpressionParser } from '../engine/ExpressionParser.js';

/**
 * CalculatorUI Class
 * Presentation and Interaction Layer for the Scientific Calculator.
 * Manages DOM events, display state, theme persistence, keyboard bindings,
 * and session history rendering.
 */
export class CalculatorUI {
  /** @type {import('../engine/ScientificCalculator.js').ScientificCalculator} */
  #calculator;

  /** @type {ExpressionParser} */
  #parser;

  // State
  #expression = '';
  #currentDisplay = '0';
  #isEvaluated = false;
  #soundEnabled = false;
  #audioCtx = null;

  // DOM Elements cache
  #elements = {};

  /**
   * @param {import('../engine/ScientificCalculator.js').ScientificCalculator} calculator
   */
  constructor(calculator) {
    if (!calculator) {
      throw new Error('CalculatorUI requires a ScientificCalculator instance.');
    }
    this.#calculator = calculator;
    this.#parser = new ExpressionParser(calculator);
  }

  /**
   * Initializes the application UI, attaches event listeners, and restores preferences.
   */
  init() {
    this.#cacheElements();
    this.#bindEvents();
    this.#bindKeyboard();
    this.#restoreTheme();
    this.#updateDisplay();
    this.#updateModeUI();
    this.#renderHistory();
  }

  /**
   * Caches critical DOM references
   */
  #cacheElements() {
    this.#elements = {
      app: document.getElementById('app-container'),
      expressionDisplay: document.getElementById('expression-preview'),
      mainDisplay: document.getElementById('main-display'),
      errorAlert: document.getElementById('error-alert'),
      errorMessage: document.getElementById('error-message'),
      dismissErrorBtn: document.getElementById('dismiss-error-btn'),
      modeBadge: document.getElementById('mode-badge'),
      degBtn: document.getElementById('mode-deg'),
      radBtn: document.getElementById('mode-rad'),
      themeToggle: document.getElementById('theme-toggle-btn'),
      soundToggle: document.getElementById('sound-toggle-btn'),
      historyToggle: document.getElementById('history-toggle-btn'),
      historyDrawer: document.getElementById('history-drawer'),
      historyCloseBtn: document.getElementById('history-close-btn'),
      historyList: document.getElementById('history-list'),
      historyEmpty: document.getElementById('history-empty'),
      clearHistoryBtn: document.getElementById('clear-history-btn'),
      exportHistoryBtn: document.getElementById('export-history-btn'),
      keypad: document.getElementById('keypad'),
      memIndicator: document.getElementById('mem-indicator'),
      ansIndicator: document.getElementById('ans-indicator')
    };
  }

  /**
   * Binds UI click, touch, and change events
   */
  #bindEvents() {
    // Mode toggles
    this.#elements.degBtn?.addEventListener('click', () => this.#setAngleMode(AngleMode.DEGREE));
    this.#elements.radBtn?.addEventListener('click', () => this.#setAngleMode(AngleMode.RADIAN));

    // Theme toggle
    this.#elements.themeToggle?.addEventListener('click', () => this.#toggleTheme());

    // Sound toggle
    this.#elements.soundToggle?.addEventListener('click', () => this.#toggleSound());

    // History drawer controls
    this.#elements.historyToggle?.addEventListener('click', () => this.#toggleHistoryDrawer());
    this.#elements.historyCloseBtn?.addEventListener('click', () => this.#closeHistoryDrawer());
    this.#elements.clearHistoryBtn?.addEventListener('click', () => this.#clearHistory());
    this.#elements.exportHistoryBtn?.addEventListener('click', () => this.#exportHistory());

    // Dismiss error button
    this.#elements.dismissErrorBtn?.addEventListener('click', () => this.#hideError());

    // Keypad event delegation
    this.#elements.keypad?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      this.#playBeep();
      this.#animateButton(btn);
      this.#handleAction(btn.dataset.action, btn.dataset.value);
    });
  }

  /**
   * Binds physical keyboard shortcuts
   */
  #bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Ignore if user is interacting with modal or input (future proofing)
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      const key = e.key;
      let matchedAction = null;
      let matchedVal = null;

      // Digits & basic operators
      if (/[0-9]/.test(key)) {
        matchedAction = 'input';
        matchedVal = key;
      } else if (key === '.') {
        matchedAction = 'input';
        matchedVal = '.';
      } else if (key === '+') {
        matchedAction = 'operator';
        matchedVal = '+';
      } else if (key === '-') {
        matchedAction = 'operator';
        matchedVal = '-';
      } else if (key === '*') {
        matchedAction = 'operator';
        matchedVal = '×';
      } else if (key === '/') {
        e.preventDefault(); // Prevent Firefox quick find
        matchedAction = 'operator';
        matchedVal = '÷';
      } else if (key === '%') {
        matchedAction = 'operator';
        matchedVal = '%';
      } else if (key === '^') {
        matchedAction = 'operator';
        matchedVal = '^';
      } else if (key === '(' || key === ')') {
        matchedAction = 'input';
        matchedVal = key;
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        matchedAction = 'calculate';
      } else if (key === 'Backspace') {
        matchedAction = 'backspace';
      } else if (key === 'Escape') {
        matchedAction = 'clear';
      } else if (key === '!') {
        matchedAction = 'postfix';
        matchedVal = '!';
      } else if (key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        matchedAction = 'function';
        matchedVal = 'sin(';
      } else if (key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
        matchedAction = 'function';
        matchedVal = 'cos(';
      } else if (key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey) {
        matchedAction = 'function';
        matchedVal = 'tan(';
      } else if (key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey) {
        matchedAction = 'function';
        matchedVal = 'log(';
      } else if (key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
        matchedAction = 'function';
        matchedVal = 'ln(';
      } else if (key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey) {
        matchedAction = 'constant';
        matchedVal = 'π';
      } else if (key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey) {
        matchedAction = 'constant';
        matchedVal = 'e';
      }

      if (matchedAction) {
        this.#highlightKeyOnKeyboard(matchedAction, matchedVal, key);
        this.#playBeep();
        this.#handleAction(matchedAction, matchedVal);
      }
    });
  }

  /**
   * Action dispatcher for button clicks and keyboard shortcuts
   * @param {string} action
   * @param {string} [value]
   */
  #handleAction(action, value) {
    this.#hideError();

    switch (action) {
      case 'input':
      case 'constant':
        this.#appendInput(value);
        break;

      case 'operator':
        this.#appendOperator(value);
        break;

      case 'function':
        this.#appendFunction(value);
        break;

      case 'postfix':
        this.#appendPostfix(value);
        break;

      case 'unary-immediate':
        this.#executeImmediateUnary(value);
        break;

      case 'memory':
        this.#handleMemory(value);
        break;

      case 'ans':
        this.#appendInput('ANS');
        break;

      case 'backspace':
        this.#backspace();
        break;

      case 'clear':
        this.#clearAll();
        break;

      case 'negate':
        this.#toggleNegate();
        break;

      case 'calculate':
        this.#calculate();
        break;

      default:
        console.warn(`Unhandled action: ${action}`);
    }

    this.#updateDisplay();
  }

  /**
   * Appends a number, decimal, or constant
   * @param {string} val
   */
  #appendInput(val) {
    if (this.#isEvaluated) {
      // If user types a digit after evaluation, reset expression
      this.#expression = '';
      this.#isEvaluated = false;
    }

    if (val === '.') {
      // Simple guard against double dot in current number
      const parts = this.#expression.split(/[\+\-\×\÷\%\^\(\)]/);
      const currentToken = parts[parts.length - 1];
      if (currentToken.includes('.')) return;
      if (this.#expression === '' || /[\+\-\×\÷\%\^\(]$/.test(this.#expression)) {
        this.#expression += '0';
      }
    }

    this.#expression += val;
  }

  /**
   * Appends a binary operator (+, -, ×, ÷, %, ^)
   * @param {string} op
   */
  #appendOperator(op) {
    this.#isEvaluated = false;

    if (this.#expression === '') {
      // If empty, use previous answer or 0
      this.#expression = this.#calculator.getLastAnswer() !== 0 
        ? String(this.#calculator.getLastAnswer()) 
        : '0';
    }

    // Replace last operator if already ending in operator
    if (/[\+\-\×\÷\%\^]$/.test(this.#expression)) {
      this.#expression = this.#expression.slice(0, -1) + op;
    } else {
      this.#expression += op;
    }
  }

  /**
   * Appends unary function with opening parenthesis e.g. sin(
   * @param {string} fn
   */
  #appendFunction(fn) {
    if (this.#isEvaluated) {
      this.#expression = '';
      this.#isEvaluated = false;
    }
    this.#expression += fn;
  }

  /**
   * Appends postfix symbol like !
   * @param {string} sym
   */
  #appendPostfix(sym) {
    this.#isEvaluated = false;
    if (this.#expression !== '' && !/[\+\-\×\÷\%\^\(]$/.test(this.#expression)) {
      this.#expression += sym;
    }
  }

  /**
   * Executes immediate unary operation on current number (1/x, x², x³, abs)
   * @param {string} op
   */
  #executeImmediateUnary(op) {
    try {
      let targetVal;
      if (this.#expression.trim() === '') {
        targetVal = this.#calculator.getLastAnswer();
      } else {
        targetVal = this.#parser.evaluate(this.#expression);
      }

      let res;
      switch (op) {
        case '1/x':
          res = this.#calculator.calculateUnary('1/x', targetVal, true);
          this.#expression = `(1/(${targetVal}))`;
          break;
        case 'x^2':
          res = this.#calculator.calculateUnary('sqr', targetVal, true);
          this.#expression = `(${targetVal})^2`;
          break;
        case 'x^3':
          res = this.#calculator.calculateUnary('cube', targetVal, true);
          this.#expression = `(${targetVal})^3`;
          break;
        case 'abs':
          res = this.#calculator.calculateUnary('abs', targetVal, true);
          this.#expression = `abs(${targetVal})`;
          break;
      }

      this.#currentDisplay = this.#formatNumber(res);
      this.#isEvaluated = true;
      this.#renderHistory();
    } catch (err) {
      this.#showError(err);
    }
  }

  /**
   * Toggles sign of the current number or wraps with negation
   */
  #toggleNegate() {
    if (this.#expression === '') {
      this.#expression = '-';
    } else if (this.#expression.startsWith('-(') && this.#expression.endsWith(')')) {
      this.#expression = this.#expression.slice(2, -1);
    } else {
      this.#expression = `-(${this.#expression})`;
    }
  }

  /**
   * Handles Memory registers (MC, MR, M+, M-)
   * @param {string} cmd
   */
  #handleMemory(cmd) {
    try {
      const currentVal = this.#expression ? this.#parser.evaluate(this.#expression) : this.#calculator.getLastAnswer();

      switch (cmd) {
        case 'MC':
          this.#calculator.memoryClear();
          break;
        case 'MR':
          this.#appendInput(String(this.#calculator.memoryRecall()));
          break;
        case 'M+':
          this.#calculator.memoryAdd(currentVal);
          break;
        case 'M-':
          this.#calculator.memorySubtract(currentVal);
          break;
      }

      this.#updateMemoryIndicator();
    } catch (err) {
      this.#showError(err);
    }
  }

  /**
   * Deletes the last character or function block
   */
  #backspace() {
    if (this.#isEvaluated) {
      this.#clearAll();
      return;
    }

    if (this.#expression.length > 0) {
      // Check multi-character functions to delete cleanly e.g. "sin(", "sqrt("
      const funcs = ['sin(', 'cos(', 'tan(', 'log(', 'sqrt(', 'fact(', 'abs('];
      for (const fn of funcs) {
        if (this.#expression.endsWith(fn)) {
          this.#expression = this.#expression.slice(0, -fn.length);
          return;
        }
      }
      this.#expression = this.#expression.slice(0, -1);
    }
  }

  /**
   * Resets calculator inputs (All Clear)
   */
  #clearAll() {
    this.#expression = '';
    this.#currentDisplay = '0';
    this.#isEvaluated = false;
    this.#hideError();
  }

  /**
   * Evaluates the current expression using ExpressionParser and ScientificCalculator
   */
  #calculate() {
    if (!this.#expression || this.#expression.trim() === '') return;

    try {
      // Balance unclosed open parentheses automatically for user convenience
      const openCount = (this.#expression.match(/\(/g) || []).length;
      const closeCount = (this.#expression.match(/\)/g) || []).length;
      let exprToEval = this.#expression;
      if (openCount > closeCount) {
        exprToEval += ')'.repeat(openCount - closeCount);
      }

      const result = this.#parser.evaluate(exprToEval);
      this.#currentDisplay = this.#formatNumber(result);
      this.#isEvaluated = true;
      this.#renderHistory();
      this.#updateMemoryIndicator();
    } catch (err) {
      this.#showError(err);
    }
  }

  /**
   * Sets angle mode (DEGREE / RADIAN)
   * @param {string} mode
   */
  #setAngleMode(mode) {
    this.#calculator.setMode(mode);
    this.#updateModeUI();
  }

  /**
   * Updates Angle Mode toggle button indicators
   */
  #updateModeUI() {
    const isDeg = this.#calculator.getMode() === AngleMode.DEGREE;
    if (this.#elements.degBtn && this.#elements.radBtn) {
      this.#elements.degBtn.classList.toggle('active', isDeg);
      this.#elements.radBtn.classList.toggle('active', !isDeg);
      this.#elements.degBtn.setAttribute('aria-pressed', String(isDeg));
      this.#elements.radBtn.setAttribute('aria-pressed', String(!isDeg));
    }
    if (this.#elements.modeBadge) {
      this.#elements.modeBadge.textContent = isDeg ? 'DEG' : 'RAD';
      this.#elements.modeBadge.className = `mode-badge ${isDeg ? 'mode-deg' : 'mode-rad'}`;
    }
  }

  /**
   * Displays formatted numerical output
   * @param {number} num
   * @returns {string}
   */
  #formatNumber(num) {
    if (Number.isNaN(num)) return 'NaN';
    if (!Number.isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity';

    // Exact integer
    if (Number.isInteger(num) && Math.abs(num) < 1e12) {
      return num.toLocaleString('en-US');
    }

    // Check if exponent notation needed for very large or tiny numbers
    if (Math.abs(num) >= 1e12 || (Math.abs(num) > 0 && Math.abs(num) < 1e-6)) {
      return num.toExponential(6).replace('e+', 'e');
    }

    // Precision cleanup
    const fixed = num.toFixed(8);
    const cleaned = parseFloat(fixed);
    return cleaned.toString();
  }

  /**
   * Updates Display DOM
   */
  #updateDisplay() {
    if (this.#elements.expressionDisplay) {
      this.#elements.expressionDisplay.textContent = this.#expression || ' ';
    }
    if (this.#elements.mainDisplay) {
      this.#elements.mainDisplay.textContent = this.#isEvaluated 
        ? this.#currentDisplay 
        : (this.#expression || '0');
    }
    if (this.#elements.ansIndicator) {
      const lastAns = this.#calculator.getLastAnswer();
      this.#elements.ansIndicator.textContent = `ANS = ${this.#formatNumber(lastAns)}`;
    }
  }

  /**
   * Updates memory register indicator in UI
   */
  #updateMemoryIndicator() {
    if (this.#elements.memIndicator) {
      const hasMem = this.#calculator.hasMemory();
      this.#elements.memIndicator.classList.toggle('active', hasMem);
      this.#elements.memIndicator.title = hasMem 
        ? `Memory: ${this.#calculator.memoryRecall()}` 
        : 'Memory Empty';
    }
  }

  /**
   * Shows error banner matching Java specification
   * @param {Error|CalculatorError} err
   */
  #showError(err) {
    const message = err.message || 'Math Error: Invalid calculation';
    if (this.#elements.errorMessage) {
      this.#elements.errorMessage.textContent = message;
    }
    if (this.#elements.errorAlert) {
      this.#elements.errorAlert.hidden = false;
      this.#elements.errorAlert.classList.add('shake');
      setTimeout(() => this.#elements.errorAlert.classList.remove('shake'), 500);
    }
    if (this.#elements.mainDisplay) {
      this.#elements.mainDisplay.textContent = 'Error';
    }
  }

  /**
   * Hides error alert banner
   */
  #hideError() {
    if (this.#elements.errorAlert) {
      this.#elements.errorAlert.hidden = true;
    }
  }

  /**
   * Renders the session history list
   */
  #renderHistory() {
    const history = this.#calculator.getHistory();
    if (!this.#elements.historyList || !this.#elements.historyEmpty) return;

    if (history.length === 0) {
      this.#elements.historyList.innerHTML = '';
      this.#elements.historyEmpty.hidden = false;
      return;
    }

    this.#elements.historyEmpty.hidden = true;
    this.#elements.historyList.innerHTML = '';

    // Render in reverse chronological order (newest on top)
    const reversed = [...history].reverse();

    for (const record of reversed) {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', `Insert result ${record.getResult()} from ID ${record.getId()}`);

      item.innerHTML = `
        <div class="history-item-header">
          <span class="history-item-id">#${record.getId()}</span>
          <span class="history-item-timestamp">${record.getTimestamp()}</span>
        </div>
        <div class="history-item-body">
          <div class="history-item-expr">${this.#escapeHtml(record.getExpression())}</div>
          <div class="history-item-result">= ${record.getFormattedResult(6)}</div>
        </div>
        <div class="history-item-actions">
          <button class="btn-history-action copy-btn" title="Copy to clipboard" data-result="${record.getResult()}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button class="btn-history-action use-btn" title="Use in current calculation" data-result="${record.getResult()}">
            Use
          </button>
        </div>
      `;

      // Click card to insert result
      item.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.copy-btn');
        const useBtn = e.target.closest('.use-btn');
        if (copyBtn) {
          navigator.clipboard.writeText(String(record.getResult()));
          this.#showToast(`Copied ${record.getResult()} to clipboard!`);
          return;
        }
        if (useBtn || !e.target.closest('button')) {
          this.#appendInput(String(record.getResult()));
          this.#updateDisplay();
          this.#showToast(`Inserted result into expression`);
        }
      });

      this.#elements.historyList.appendChild(item);
    }
  }

  /**
   * Clears session history
   */
  #clearHistory() {
    this.#calculator.clearHistory();
    this.#renderHistory();
    this.#showToast('Calculation history cleared.');
  }

  /**
   * Exports history records as text/JSON
   */
  #exportHistory() {
    const history = this.#calculator.getHistory();
    if (history.length === 0) {
      this.#showToast('No history records to export.');
      return;
    }

    const text = history.map(r => r.toString()).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calculator-history-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.#showToast('History exported successfully!');
  }

  /**
   * Drawer toggle controls
   */
  #toggleHistoryDrawer() {
    if (!this.#elements.historyDrawer) return;
    const isOpen = this.#elements.historyDrawer.classList.toggle('open');
    this.#elements.historyToggle?.setAttribute('aria-expanded', String(isOpen));
  }

  #closeHistoryDrawer() {
    this.#elements.historyDrawer?.classList.remove('open');
    this.#elements.historyToggle?.setAttribute('aria-expanded', 'false');
  }

  /**
   * Theme switcher and persistence
   */
  #toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('calc_theme', nextTheme);
    this.#updateThemeIcon(nextTheme);
  }

  #restoreTheme() {
    const saved = localStorage.getItem('calc_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    this.#updateThemeIcon(saved);
  }

  #updateThemeIcon(theme) {
    if (!this.#elements.themeToggle) return;
    const isDark = theme === 'dark';
    this.#elements.themeToggle.innerHTML = isDark
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    this.#elements.themeToggle.title = isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme';
  }

  /**
   * Audio synthesis click sound
   */
  #toggleSound() {
    this.#soundEnabled = !this.#soundEnabled;
    if (this.#elements.soundToggle) {
      this.#elements.soundToggle.classList.toggle('active', this.#soundEnabled);
      this.#elements.soundToggle.title = this.#soundEnabled ? 'Mute Button Sound' : 'Enable Button Sound';
    }
  }

  #playBeep() {
    if (!this.#soundEnabled) return;
    try {
      if (!this.#audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.#audioCtx = new AudioContext();
      }
      if (this.#audioCtx.state === 'suspended') {
        this.#audioCtx.resume();
      }
      const osc = this.#audioCtx.createOscillator();
      const gain = this.#audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, this.#audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, this.#audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.#audioCtx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.#audioCtx.destination);
      osc.start();
      osc.stop(this.#audioCtx.currentTime + 0.05);
    } catch (_) {
      // Audio context may be restricted by autoplay policy
    }
  }

  /**
   * Tactile button ripple/scale animation
   * @param {HTMLElement} btn
   */
  #animateButton(btn) {
    btn.classList.add('btn-pressed');
    setTimeout(() => btn.classList.remove('btn-pressed'), 140);
  }

  /**
   * Highlights corresponding on-screen button when user types on physical keyboard
   */
  #highlightKeyOnKeyboard(action, val, rawKey) {
    let selector = `button[data-action="${action}"]`;
    if (val) {
      selector += `[data-value="${val}"]`;
    }
    const btn = document.querySelector(selector);
    if (btn) {
      this.#animateButton(btn);
    }
  }

  /**
   * Displays subtle floating toast message
   * @param {string} msg
   */
  #showToast(msg) {
    let toast = document.getElementById('calc-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'calc-toast';
      toast.className = 'calc-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
  }

  #escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
