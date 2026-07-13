/* ═══════════════════════════════════════════════════════════════════
   CalcMaster — Main Controller  v1.1
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

// ── State ──────────────────────────────────────────────────────────
let activeTab   = 'simple';
let calcMode    = 'derivative';
let currentProblem = null;    // active practice problem

// ── Formula Catalog (for Formula Sheets tab) ───────────────────────
const FORMULA_CATALOG = [
  {
    title: 'Differentiation Rules',
    items: [
      { name: 'Constant',        latex: '\\frac{d}{dx}[c] = 0' },
      { name: 'Power Rule',      latex: '\\frac{d}{dx}[x^n] = n x^{n-1}' },
      { name: 'Sum Rule',        latex: '(f+g)\'= f\'+g\'' },
      { name: 'Product Rule',    latex: '(fg)\' = f\'g + fg\'' },
      { name: 'Quotient Rule',   latex: '\\left(\\frac{f}{g}\\right)\' = \\frac{f\'g - fg\'}{g^2}' },
      { name: 'Chain Rule',      latex: '\\frac{d}{dx}f(g(x)) = f\'(g(x))\\cdot g\'(x)' },
      { name: 'Exponential',     latex: '\\frac{d}{dx}[e^x] = e^x' },
      { name: 'Natural Log',     latex: '\\frac{d}{dx}[\\ln x] = \\frac{1}{x}' },
    ]
  },
  {
    title: 'Trig Derivatives',
    items: [
      { name: 'sin',  latex: '\\frac{d}{dx}[\\sin x] = \\cos x' },
      { name: 'cos',  latex: '\\frac{d}{dx}[\\cos x] = -\\sin x' },
      { name: 'tan',  latex: '\\frac{d}{dx}[\\tan x] = \\sec^2 x' },
      { name: 'sec',  latex: '\\frac{d}{dx}[\\sec x] = \\sec x\\tan x' },
      { name: 'csc',  latex: '\\frac{d}{dx}[\\csc x] = -\\csc x\\cot x' },
      { name: 'cot',  latex: '\\frac{d}{dx}[\\cot x] = -\\csc^2 x' },
    ]
  },
  {
    title: 'Inverse Trig Derivatives',
    items: [
      { name: 'arcsin', latex: '\\frac{d}{dx}[\\arcsin x] = \\frac{1}{\\sqrt{1-x^2}}' },
      { name: 'arccos', latex: '\\frac{d}{dx}[\\arccos x] = -\\frac{1}{\\sqrt{1-x^2}}' },
      { name: 'arctan', latex: '\\frac{d}{dx}[\\arctan x] = \\frac{1}{1+x^2}' },
    ]
  },
  {
    title: 'Integration Rules',
    items: [
      { name: 'Power',          latex: '\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C' },
      { name: 'Constant',       latex: '\\int c\\,dx = cx + C' },
      { name: '1/x',            latex: '\\int \\frac{1}{x}\\,dx = \\ln|x| + C' },
      { name: 'Exponential',    latex: '\\int e^x\\,dx = e^x + C' },
      { name: 'By Parts',       latex: '\\int u\\,dv = uv - \\int v\\,du' },
      { name: 'FTC',            latex: '\\int_a^b f\'(x)\\,dx = f(b)-f(a)' },
    ]
  },
  {
    title: 'Common Integrals',
    items: [
      { name: 'sin',   latex: '\\int \\sin x\\,dx = -\\cos x + C' },
      { name: 'cos',   latex: '\\int \\cos x\\,dx = \\sin x + C' },
      { name: 'sec²',  latex: '\\int \\sec^2 x\\,dx = \\tan x + C' },
      { name: '1/(1+x²)', latex: '\\int \\frac{1}{1+x^2}\\,dx = \\arctan x + C' },
    ]
  },
  {
    title: 'Limits & Special Forms',
    items: [
      { name: "L'Hôpital",     latex: '\\lim\\frac{f}{g} = \\lim\\frac{f\'}{g\'}\\quad(0/0\\text{ or }\\infty/\\infty)' },
      { name: 'sin limit',     latex: '\\lim_{x\\to 0}\\frac{\\sin x}{x} = 1' },
      { name: 'e definition',  latex: '\\lim_{n\\to\\infty}\\left(1+\\frac{1}{n}\\right)^n = e' },
      { name: 'Squeeze Thm',   latex: 'g(x)\\le f(x)\\le h(x) \\Rightarrow \\lim f=\\lim g=\\lim h' },
    ]
  },
  {
    title: 'Taylor / Maclaurin Series',
    items: [
      { name: 'Taylor',   latex: 'f(x) = \\sum_{n=0}^{\\infty}\\frac{f^{(n)}(a)}{n!}(x-a)^n' },
      { name: 'eˣ',       latex: 'e^x = \\sum_{n=0}^{\\infty}\\frac{x^n}{n!}' },
      { name: 'sin x',    latex: '\\sin x = \\sum_{n=0}^{\\infty}\\frac{(-1)^n x^{2n+1}}{(2n+1)!}' },
      { name: 'cos x',    latex: '\\cos x = \\sum_{n=0}^{\\infty}\\frac{(-1)^n x^{2n}}{(2n)!}' },
      { name: 'ln(1+x)',  latex: '\\ln(1+x) = \\sum_{n=1}^{\\infty}\\frac{(-1)^{n+1}x^n}{n}' },
    ]
  },
  {
    title: 'Vector Calculus',
    items: [
      { name: 'Gradient',   latex: '\\nabla f = \\frac{\\partial f}{\\partial x}\\mathbf{i}+\\frac{\\partial f}{\\partial y}\\mathbf{j}+\\frac{\\partial f}{\\partial z}\\mathbf{k}' },
      { name: 'Divergence', latex: '\\nabla\\cdot\\mathbf{F} = \\frac{\\partial P}{\\partial x}+\\frac{\\partial Q}{\\partial y}+\\frac{\\partial R}{\\partial z}' },
      { name: "Green's",    latex: '\\oint_C P\\,dx+Q\\,dy = \\iint_D\\left(\\frac{\\partial Q}{\\partial x}-\\frac{\\partial P}{\\partial y}\\right)dA' },
      { name: "Stokes'",    latex: '\\oint_C \\mathbf{F}\\cdot d\\mathbf{r} = \\iint_S (\\nabla\\times\\mathbf{F})\\cdot d\\mathbf{S}' },
    ]
  },
];

// ══ Initialise ════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initSimpleCalc();
  initCalculator();
  initGrapher();
  initPractice();
  initFormulas();
  initHistory();
  renderFormulas();
  loadHistory();
  checkAndShowUser();
});

// ══ Navigation ════════════════════════════════════════════════════════
function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      switchTab(item.dataset.tab);
    });
  });
  document.getElementById('sidebar-auth-btn')
    .addEventListener('click', () => switchTab('history'));
}

function switchTab(tab) {
  activeTab = tab;

  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.toggle('active', p.id === 'tab-' + tab);
  });

  const titles = {
    simple:     ['Simple Calculator',     'Basic arithmetic · Fast & clean'],
    calculator: ['Calculus Solver',       'Symbolic CAS Engine · Step-by-Step Solutions'],
    grapher:    ['2D / 3D Grapher',       'Interactive function visualization'],
    practice:   ['Practice Laboratory',  'Graded calculus challenges with hints'],
    formulas:   ['Formula Sheets',        'Quick reference for standard calculus identities'],
    history:    ['History & Cloud Sync',  'Postgres-backed calculation history via Supabase'],
  };
  const [title, desc] = titles[tab] || ['', ''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-desc').textContent  = desc;

  if (tab === 'grapher') renderFullscreenPlot();
  if (tab === 'history') loadHistory();
}

// ══ Simple Calculator ═════════════════════════════════════════════════
function initSimpleCalc() {
  let expr = '';
  let justEvaled = false;

  const exprEl = document.getElementById('simple-expr');
  const valEl  = document.getElementById('simple-val');

  function countBrackets(s) {
    let open = 0;
    for (const c of s) { if (c === '(') open++; else if (c === ')') open--; }
    return open;
  }

  function liveEval(s) {
    try {
      // Replace implicit percent
      let safe = s.replace(/%/g, '/100');
      // Only eval if expression is seemingly complete
      if (/[+\-*/]$/.test(safe.trim()) || safe.trim() === '') return null;
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + safe + ')')();
      if (!isFinite(result)) return null;
      return +result.toPrecision(12);
    } catch { return null; }
  }

  function updateDisplay() {
    exprEl.textContent = expr
      .replace(/\*/g, '×')
      .replace(/\//g, '÷');
    if (expr === '') {
      valEl.textContent = '0';
      return;
    }
    const live = liveEval(expr);
    if (live !== null && String(live) !== expr) {
      valEl.textContent = live;
    } else {
      valEl.textContent = expr.replace(/\*/g, '×').replace(/\//g, '÷');
    }
  }

  function handleInput(val) {
    const ops = ['+', '-', '*', '/'];

    if (val === 'C') {
      expr = '';
      justEvaled = false;
      updateDisplay();
      return;
    }

    if (val === 'back') {
      if (justEvaled) { expr = ''; justEvaled = false; }
      else expr = expr.slice(0, -1);
      updateDisplay();
      return;
    }

    if (val === '=') {
      if (!expr) return;
      const result = liveEval(expr);
      if (result === null) return;
      const displayExpr = expr.replace(/\*/g, '×').replace(/\//g, '÷');
      // Save to history
      SyncDB.saveCalculation({
        title:        `CALC: ${displayExpr} = ${result}`,
        expression:   expr,
        calc_type:    'simple',
        result_latex: String(result),
        steps_json:   [],
      }).then(() => loadHistory());
      exprEl.textContent = displayExpr + ' =';
      valEl.textContent = result;
      expr = String(result);
      justEvaled = true;
      return;
    }

    if (val === '%') {
      if (expr) { expr += '%'; }
      updateDisplay();
      return;
    }

    if (val === '()') {
      // Auto-decide open or close bracket
      if (expr === '' || ops.includes(expr.slice(-1)) || expr.slice(-1) === '(') {
        expr += '(';
      } else if (countBrackets(expr) > 0) {
        expr += ')';
      } else {
        expr += '(';
      }
      justEvaled = false;
      updateDisplay();
      return;
    }

    // If user pressed a digit/dot right after eval, start fresh
    if (justEvaled && !ops.includes(val)) {
      expr = '';
    }
    justEvaled = false;

    // Prevent double operators
    if (ops.includes(val) && ops.includes(expr.slice(-1))) {
      expr = expr.slice(0, -1) + val;
    } else if (val === '.' && /\.\d*$/.test(expr.split(/[+\-*/]/).pop())) {
      // Prevent double decimal in same number
      return;
    } else {
      expr += val;
    }
    updateDisplay();
  }

  // Button clicks
  document.querySelectorAll('.simple-btn').forEach(btn => {
    btn.addEventListener('click', () => handleInput(btn.dataset.val));
  });

  // Keyboard support
  document.addEventListener('keydown', e => {
    if (activeTab !== 'simple') return;
    const key = e.key;
    if (/^[0-9.]$/.test(key))            handleInput(key);
    else if (key === '+')                 handleInput('+');
    else if (key === '-')                 handleInput('-');
    else if (key === '*')                 handleInput('*');
    else if (key === '/')                 { e.preventDefault(); handleInput('/'); }
    else if (key === '%')                 handleInput('%');
    else if (key === 'Enter' || key === '=') handleInput('=');
    else if (key === 'Backspace')         handleInput('back');
    else if (key === 'Escape')            handleInput('C');
    else if (key === '(' || key === ')')  handleInput('()');
  });

  updateDisplay();
}

// ══ Calculator ════════════════════════════════════════════════════════
function initCalculator() {
  // Mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setCalcMode(btn.dataset.mode);
    });
  });

  // Symbol palette
  document.querySelectorAll('.pal').forEach(btn => {
    btn.addEventListener('click', () => insertAtCursor(btn.dataset.ins));
  });

  // Input live preview
  document.getElementById('math-input').addEventListener('input', updatePreview);

  // Clear button
  document.getElementById('btn-clear').addEventListener('click', () => {
    document.getElementById('math-input').value = '';
    updatePreview();
  });

  // Solve
  document.getElementById('btn-solve').addEventListener('click', solve);

  // Expand all
  document.getElementById('btn-expand-all').addEventListener('click', () => {
    document.querySelectorAll('#steps-container .step-node').forEach(n => n.classList.add('open'));
  });

  // Copy LaTeX
  document.getElementById('btn-copy-latex').addEventListener('click', () => {
    const raw = document.getElementById('btn-copy-latex').dataset.latex || '';
    navigator.clipboard.writeText(raw).then(() => flashBtn('btn-copy-latex', '✓ Copied'));
  });

  // Save calculation
  document.getElementById('btn-save-calc').addEventListener('click', async () => {
    const stored = document.getElementById('btn-save-calc').dataset.payload;
    if (!stored) return;
    await SyncDB.saveCalculation(JSON.parse(stored));
    flashBtn('btn-save-calc', '✓ Saved');
    loadHistory();
  });

  setCalcMode('derivative');
  updatePreview();
}

function setCalcMode(mode) {
  calcMode = mode;
  const opts = document.getElementById('dynamic-opts');
  opts.innerHTML = '';

  if (mode === 'derivative') {
    opts.innerHTML = `
      <div class="option-group">
        <label class="field-label-sm">Order</label>
        <select class="sel" id="opt-order">
          <option value="1" selected>1st</option>
          <option value="2">2nd</option>
          <option value="3">3rd</option>
        </select>
      </div>
      <div class="option-group">
        <label class="field-label-sm">Method</label>
        <select class="sel" id="opt-deriv-type">
          <option value="explicit" selected>Explicit</option>
          <option value="implicit">Implicit dy/dx</option>
        </select>
      </div>`;

  } else if (mode === 'integral') {
    opts.innerHTML = `
      <div class="option-group">
        <label class="field-label-sm">Lower (a)</label>
        <input type="text" class="num-inp" id="opt-lower" placeholder="—" />
      </div>
      <div class="option-group">
        <label class="field-label-sm">Upper (b)</label>
        <input type="text" class="num-inp" id="opt-upper" placeholder="—" />
      </div>`;

  } else if (mode === 'limit') {
    opts.innerHTML = `
      <div class="option-group">
        <label class="field-label-sm">Approach</label>
        <input type="text" class="num-inp" id="opt-point" value="0" style="width:70px;text-align:center" />
      </div>
      <div class="option-group">
        <label class="field-label-sm">Direction</label>
        <select class="sel" id="opt-dir">
          <option value="both" selected>Both ±</option>
          <option value="right">Right +</option>
          <option value="left">Left −</option>
        </select>
      </div>`;

  } else if (mode === 'series') {
    opts.innerHTML = `
      <div class="option-group">
        <label class="field-label-sm">Center (a)</label>
        <input type="text" class="num-inp" id="opt-center" value="0" style="width:60px;text-align:center" />
      </div>
      <div class="option-group">
        <label class="field-label-sm">Terms</label>
        <input type="number" class="num-inp" id="opt-terms" value="6" min="1" max="15" style="width:60px;text-align:center" />
      </div>`;

  } else if (mode === 'vector_calc') {
    opts.innerHTML = `
      <div class="option-group">
        <label class="field-label-sm">Operation</label>
        <select class="sel" id="opt-vec-type">
          <option value="gradient" selected>Gradient ∇f</option>
          <option value="divergence">Divergence ∇·F</option>
          <option value="curl">Curl ∇×F</option>
        </select>
      </div>`;
  }
  // ode: no extra params needed
}

function gatherParams() {
  const params = {};
  if (calcMode === 'derivative') {
    params.order = +(document.getElementById('opt-order')?.value || 1);
    params.type  = document.getElementById('opt-deriv-type')?.value || 'explicit';
  } else if (calcMode === 'integral') {
    params.lower = document.getElementById('opt-lower')?.value.trim() || '';
    params.upper = document.getElementById('opt-upper')?.value.trim() || '';
  } else if (calcMode === 'limit') {
    params.point     = document.getElementById('opt-point')?.value.trim() || '0';
    params.direction = document.getElementById('opt-dir')?.value || 'both';
  } else if (calcMode === 'series') {
    params.point = document.getElementById('opt-center')?.value.trim() || '0';
    params.terms = +(document.getElementById('opt-terms')?.value || 6);
  } else if (calcMode === 'vector_calc') {
    params.vector_type = document.getElementById('opt-vec-type')?.value || 'gradient';
  }
  return params;
}

async function solve() {
  const expr = document.getElementById('math-input').value.trim();
  if (!expr) return shakeBorder('input-wrap');

  showState('loading');

  const body = {
    expression: expr,
    calc_type:  calcMode,
    var:        document.getElementById('opt-var').value,
    params:     gatherParams()
  };

  try {
    const res = await postJSON('/api/solve', body);
    if (res.success) {
      renderResults(res, expr, body);
      // Draw graph unless it's vector/ode
      if (!['vector_calc', 'ode'].includes(calcMode)) {
        fetchAndPlot(expr, body.var, 'result-plot');
      } else {
        document.getElementById('graph-card').classList.add('hidden');
      }
    } else {
      showError(res.error || 'CAS engine returned an error.');
    }
  } catch (e) {
    showError('Connection error — is the Flask server running?');
  }
}

function renderResults(res, expr, body) {
  showState('results');

  // Answer card
  const latexDiv = document.getElementById('result-latex');
  document.getElementById('answer-card').className = 'glass result-card answer-card-glow';
  katex.render(res.result_latex, latexDiv, { throwOnError: false, displayMode: true });

  // Numeric
  const numDiv = document.getElementById('result-numeric');
  if (res.result_numeric != null) {
    numDiv.textContent = '≈ ' + Number(res.result_numeric).toFixed(6);
    numDiv.classList.remove('hidden');
  } else {
    numDiv.classList.add('hidden');
  }

  // Store data on buttons
  document.getElementById('btn-copy-latex').dataset.latex = res.result_latex;
  document.getElementById('btn-save-calc').dataset.payload = JSON.stringify({
    title:        `${calcMode.toUpperCase()}: ${expr}`,
    expression:    expr,
    calc_type:     calcMode,
    result_latex:  res.result_latex,
    steps_json:    res.steps,
  });

  // Steps
  const stepsEl = document.getElementById('steps-container');
  stepsEl.innerHTML = '';
  (res.steps || []).forEach((group, idx) => {
    const node = document.createElement('div');
    node.className = 'step-node' + (idx === 0 ? ' open' : '');
    node.innerHTML = `
      <div class="step-header">
        <span class="step-heading">${group.title || 'Step ' + (idx + 1)}</span>
        <span class="step-chevron">▾</span>
      </div>
      <div class="step-body"></div>`;

    const body = node.querySelector('.step-body');
    (group.step_nodes || []).forEach(sn => {
      const sub = document.createElement('div');
      sub.className = 'step-sub';

      const desc = document.createElement('p');
      desc.className = 'step-desc';
      desc.innerHTML = renderInlineMath(sn.desc || '');
      sub.appendChild(desc);

      if (sn.latex) {
        const math = document.createElement('div');
        math.className = 'step-math-block';
        katex.render(sn.latex, math, { throwOnError: false, displayMode: true });
        sub.appendChild(math);
      }
      body.appendChild(sub);
    });

    node.querySelector('.step-header').addEventListener('click', () => {
      node.classList.toggle('open');
    });
    stepsEl.appendChild(node);
  });

  document.getElementById('graph-card').classList.remove('hidden');
  document.getElementById('steps-card').classList.remove('hidden');
}

function showState(state) {
  document.getElementById('empty-state').classList.add('hidden');
  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('results').classList.add('hidden');
  if (state === 'loading') document.getElementById('loading-state').classList.remove('hidden');
  if (state === 'results') document.getElementById('results').classList.remove('hidden');
  if (state === 'empty')   document.getElementById('empty-state').classList.remove('hidden');
}

function showError(msg) {
  showState('empty');
  const es = document.getElementById('empty-state');
  es.innerHTML = `
    <div class="empty-icon" style="color:#f87171;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    </div>
    <h3 style="color:#f87171">Error</h3>
    <p>${msg}</p>`;
}

// ── Plot helpers ──────────────────────────────────────────────────────
const PLOTLY_LAYOUT = () => ({
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor:  'rgba(0,0,0,0)',
  margin: { t: 10, b: 40, l: 50, r: 20 },
  font:  { color: '#94a3b8', family: 'Outfit, sans-serif', size: 12 },
  xaxis: { gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.12)', color: '#94a3b8' },
  yaxis: { gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.12)', color: '#94a3b8' },
});

async function fetchAndPlot(expr, varSym, containerId, opts = {}) {
  try {
    const body = {
      expression: expr, var: varSym || 'x',
      dimensions: opts.dim || 2,
      x_min: opts.xMin || -10, x_max: opts.xMax || 10,
    };
    if (opts.dim === 3) {
      body.var2 = opts.var2 || 'y';
      body.y_min = opts.yMin || -5; body.y_max = opts.yMax || 5;
    }
    const res = await postJSON('/api/plot', body);
    if (!res.success) return;

    const layout = PLOTLY_LAYOUT();
    let traces;

    if (res.dimension === 2) {
      traces = [{ x: res.x, y: res.y, mode: 'lines',
        line: { color: '#7c3aed', width: 2.5 }, name: 'f(x)' }];
    } else {
      traces = [{ x: res.x, y: res.y, z: res.z, type: 'surface',
        colorscale: 'Electric', showscale: false, opacity: 0.88 }];
      layout.scene = {
        bgcolor: 'rgba(0,0,0,0)',
        xaxis: { gridcolor: 'rgba(255,255,255,0.05)', color: '#94a3b8' },
        yaxis: { gridcolor: 'rgba(255,255,255,0.05)', color: '#94a3b8' },
        zaxis: { gridcolor: 'rgba(255,255,255,0.05)', color: '#94a3b8' },
      };
    }

    Plotly.react(containerId, traces, layout, { responsive: true, displayModeBar: false });
  } catch (e) {
    console.warn('Plot error:', e);
  }
}

// ══ Grapher tab ═══════════════════════════════════════════════════════
function initGrapher() {
  document.getElementById('btn-plot').addEventListener('click', renderFullscreenPlot);
  document.getElementById('g-dim').addEventListener('change', () => {
    const is3d = document.getElementById('g-dim').value === '3';
    document.querySelectorAll('.graph-3d-only')
      .forEach(el => el.classList.toggle('hidden', !is3d));
  });
}

async function renderFullscreenPlot() {
  const expr = document.getElementById('g-expr').value.trim();
  if (!expr) return;
  const dim = +document.getElementById('g-dim').value;
  await fetchAndPlot(expr, 'x', 'fullscreen-plot', {
    dim,
    xMin: +document.getElementById('g-xmin').value,
    xMax: +document.getElementById('g-xmax').value,
    var2: 'y',
    yMin: +(document.getElementById('g-ymin')?.value || -5),
    yMax: +(document.getElementById('g-ymax')?.value || 5),
  });
}

// ══ Practice Lab ══════════════════════════════════════════════════════
function initPractice() {
  document.getElementById('btn-gen-problem').addEventListener('click', generateProblem);
}

async function generateProblem() {
  const type = document.getElementById('p-type').value;
  const diff = document.getElementById('p-diff').value;

  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (diff) params.set('difficulty', diff);

  try {
    const res = await fetch('/api/practice?' + params.toString()).then(r => r.json());
    if (!res.success) { alert(res.error); return; }
    renderProblem(res.problem);
  } catch (e) {
    alert('Could not connect to server.');
  }
}

function renderProblem(prob) {
  currentProblem = prob;
  const main = document.getElementById('practice-main');

  const chipColor = { Easy: 'chip-teal', Medium: 'chip-indigo', Hard: 'chip-cyan' };
  const cc = chipColor[prob.difficulty] || 'chip-dark';

  main.innerHTML = `
    <div class="glass problem-card">
      <div class="problem-chips">
        <span class="chip ${cc}">${prob.difficulty}</span>
        <span class="chip chip-dark">${prob.type.toUpperCase()}</span>
      </div>

      <div class="problem-statement" id="prob-statement"></div>

      <div class="answer-section">
        <label class="field-label-sm">Your Answer</label>
        <div class="input-wrap">
          <svg class="inp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          <input type="text" class="math-input" id="p-answer" placeholder="e.g.  2x + cos(x)" spellcheck="false" />
        </div>
        <div id="p-answer-preview" class="answer-preview"></div>
      </div>

      <div class="practice-actions">
        <button class="btn btn-ghost" id="p-hint-btn">💡 Hint</button>
        <button class="btn btn-ghost" id="p-open-btn">↗ Open in Solver</button>
        <button class="btn btn-solve" style="flex:1" id="p-check-btn">✓ Check Answer</button>
      </div>

      <div id="p-feedback" class="hidden"></div>
      <div id="p-steps-reveal" class="hidden">
        <button class="btn btn-ghost w-full" id="p-show-steps-btn" style="margin-top:10px">Show Full Solution Steps</button>
        <div id="p-steps-log" class="steps-list hidden"></div>
      </div>
    </div>`;

  // Render problem question with KaTeX
  katex.render(prob.question, document.getElementById('prob-statement'),
    { throwOnError: false, displayMode: true });

  // Live answer preview
  document.getElementById('p-answer').addEventListener('input', () => {
    const val = document.getElementById('p-answer').value;
    const prev = document.getElementById('p-answer-preview');
    katex.render(inputToLatex(val) || '\\text{…}', prev,
      { throwOnError: false, displayMode: false });
  });

  document.getElementById('p-hint-btn').addEventListener('click', () => alert('💡 ' + prob.hint));
  document.getElementById('p-open-btn').addEventListener('click', () => openInSolver(prob));
  document.getElementById('p-check-btn').addEventListener('click', checkAnswer);

  document.getElementById('p-show-steps-btn')?.addEventListener('click', revealSteps);
}

function openInSolver(prob) {
  switchTab('calculator');
  document.getElementById('math-input').value = prob.problem;
  setCalcMode(prob.type);
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === prob.type);
  });
  if (prob.type === 'limit' && prob.params?.point) {
    setTimeout(() => {
      const el = document.getElementById('opt-point');
      if (el) el.value = prob.params.point;
    }, 60);
  }
  updatePreview();
}

async function checkAnswer() {
  const expr = document.getElementById('p-answer').value.trim();
  if (!expr || !currentProblem) return;

  const feedDiv = document.getElementById('p-feedback');
  feedDiv.className = '';
  feedDiv.textContent = 'Grading…';
  feedDiv.classList.remove('hidden');

  try {
    // Get canonical answer from server
    const solveRes = await postJSON('/api/solve', {
      expression: currentProblem.problem,
      calc_type:  currentProblem.type,
      var:        currentProblem.var || 'x',
      params:     currentProblem.params || {},
    });

    if (!solveRes.success) {
      feedDiv.className = 'feedback-box feedback-error';
      feedDiv.textContent = 'Could not compute expected answer.';
      return;
    }

    // Numeric equivalence check via plot API
    const isCorrect = await numericEquivCheck(
      expr, solveRes.result_raw,
      currentProblem.var || 'x',
      currentProblem.type === 'integral'
    );

    if (isCorrect) {
      feedDiv.className = 'feedback-box feedback-success';
      feedDiv.innerHTML = '✓ Correct! Great work.';
    } else {
      feedDiv.className = 'feedback-box feedback-error';
      feedDiv.innerHTML = '✗ Not quite right. Try simplifying, or use the hint.';
    }

    document.getElementById('p-steps-reveal').classList.remove('hidden');
  } catch (e) {
    feedDiv.className = 'feedback-box feedback-error';
    feedDiv.textContent = 'Server error during grading.';
  }
}

async function numericEquivCheck(userExpr, exactExpr, varSym, isIntegral) {
  try {
    const [uRes, eRes] = await Promise.all([
      postJSON('/api/plot', { expression: userExpr, var: varSym, dimensions: 2 }),
      postJSON('/api/plot', { expression: exactExpr, var: varSym, dimensions: 2 }),
    ]);
    if (!uRes.success || !eRes.success) return false;

    const uy = uRes.y, ey = eRes.y;
    let diffs = [], firsts = [];

    for (let i = 0; i < uy.length; i++) {
      if (uy[i] != null && ey[i] != null) {
        diffs.push(uy[i] - ey[i]);
        firsts.push(Math.abs(uy[i] - ey[i]));
      }
    }
    if (firsts.length === 0) return false;

    // For integrals: allow constant offset (indefinite integral + C)
    if (isIntegral) {
      const firstDiff = diffs[0];
      return diffs.every(d => Math.abs(d - firstDiff) < 0.05);
    }

    // Otherwise require close values
    const wrongCount = firsts.filter(d => d > 0.01).length;
    return wrongCount / firsts.length < 0.1;
  } catch { return false; }
}

async function revealSteps() {
  const stepsLog = document.getElementById('p-steps-log');
  stepsLog.classList.remove('hidden');
  stepsLog.innerHTML = '<div class="spinner" style="margin:20px auto;"></div>';

  const res = await postJSON('/api/solve', {
    expression: currentProblem.problem,
    calc_type:  currentProblem.type,
    var:        currentProblem.var || 'x',
    params:     currentProblem.params || {},
  });

  stepsLog.innerHTML = '';
  if (!res.success) { stepsLog.textContent = 'Steps unavailable.'; return; }

  (res.steps || []).forEach((grp, idx) => {
    const node = document.createElement('div');
    node.className = 'step-node open';
    const body = document.createElement('div');
    body.className = 'step-body';
    body.style.display = 'block';

    (grp.step_nodes || []).forEach(sn => {
      const sub = document.createElement('div');
      sub.className = 'step-sub';
      sub.innerHTML = `<p class="step-desc">${renderInlineMath(sn.desc || '')}</p>`;
      if (sn.latex) {
        const m = document.createElement('div');
        m.className = 'step-math-block';
        katex.render(sn.latex, m, { throwOnError: false, displayMode: true });
        sub.appendChild(m);
      }
      body.appendChild(sub);
    });

    node.innerHTML = `<div class="step-header"><span class="step-heading">${grp.title}</span></div>`;
    node.appendChild(body);
    stepsLog.appendChild(node);
  });
}

// ══ Formula Sheets ════════════════════════════════════════════════════
function initFormulas() {
  document.getElementById('formula-search').addEventListener('input', filterFormulas);
}

function renderFormulas() {
  const grid = document.getElementById('formulas-grid');
  grid.innerHTML = '';
  FORMULA_CATALOG.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'glass formula-card';

    const rows = cat.items.map(item => {
      const td = document.createElement('td');
      td.className = 'fml-math';
      // We render after appending
      return `<tr data-name="${item.name.toLowerCase()}">
        <td>${item.name}</td>
        <td class="fml-math">${item.latex}</td>
      </tr>`;
    }).join('');

    card.innerHTML = `
      <p class="formula-card-title">${cat.title}</p>
      <table class="formula-table"><tbody>${rows}</tbody></table>`;

    grid.appendChild(card);

    // Typeset all .fml-math cells
    card.querySelectorAll('.fml-math').forEach(cell => {
      katex.render(cell.textContent, cell, { throwOnError: false });
    });
  });
}

function filterFormulas() {
  const q = document.getElementById('formula-search').value.toLowerCase();
  document.querySelectorAll('.formula-card').forEach(card => {
    let anyShown = false;
    card.querySelectorAll('tbody tr').forEach(row => {
      const name = row.dataset.name || '';
      const show = !q || name.includes(q);
      row.style.display = show ? '' : 'none';
      if (show) anyShown = true;
    });
    card.style.display = anyShown || !q ? '' : 'none';
  });
}

// ══ History & Auth ════════════════════════════════════════════════════
function initHistory() {
  document.getElementById('auth-form').addEventListener('submit', handleAuth);
  document.getElementById('btn-logout').addEventListener('click', handleLogout);
  document.getElementById('btn-clear-history').addEventListener('click', async () => {
    if (!confirm('Delete all saved calculations?')) return;
    await SyncDB.clearHistory();
    loadHistory();
  });

  // Tab switching
  const tabLogin = document.getElementById('tab-btn-login');
  const tabSignup = document.getElementById('tab-btn-signup');
  const groupUsername = document.getElementById('group-username');
  const authMode = document.getElementById('auth-mode');
  const btnAuth = document.getElementById('btn-auth');
  const errEl = document.getElementById('auth-error');

  if (tabLogin && tabSignup) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      groupUsername.classList.add('hidden');
      authMode.value = 'login';
      btnAuth.textContent = 'Log In';
      errEl.classList.add('hidden');
    });

    tabSignup.addEventListener('click', () => {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      groupUsername.classList.remove('hidden');
      authMode.value = 'signup';
      btnAuth.textContent = 'Create Account';
      errEl.classList.add('hidden');
    });
  }

  // Password toggle
  const togglePass = document.getElementById('btn-toggle-pass');
  const passInp = document.getElementById('auth-pass');
  if (togglePass && passInp) {
    togglePass.addEventListener('click', () => {
      const isPass = passInp.type === 'password';
      passInp.type = isPass ? 'text' : 'password';
      togglePass.classList.toggle('active', !isPass);
    });
  }
}

async function handleAuth(e) {
  e.preventDefault();
  const mode  = document.getElementById('auth-mode').value;
  const email = document.getElementById('auth-email').value.trim();
  const pass  = document.getElementById('auth-pass').value;
  const errEl = document.getElementById('auth-error');
  errEl.classList.add('hidden');

  const btnAuth = document.getElementById('btn-auth');
  const originalText = btnAuth.textContent;
  btnAuth.disabled = true;
  btnAuth.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;margin-top:0;"></div> Processing...';

  try {
    if (mode === 'signup') {
      const username = document.getElementById('auth-username').value.trim();
      await SyncDB.signUp(email, pass, username);
      const user = await SyncDB.getCurrentUser();
      // If client is cloud connected but signup did not auto-login (requires confirmation)
      if (!user && window.isCloudConnected) {
        errEl.className = 'auth-error';
        errEl.style.background = 'rgba(16,185,129,.1)';
        errEl.style.borderColor = 'rgba(16,185,129,.2)';
        errEl.style.color = '#10b981';
        errEl.textContent = 'Account created! Please check your email inbox to confirm your registration.';
        errEl.classList.remove('hidden');
      } else {
        checkAndShowUser();
        loadHistory();
      }
    } else {
      await SyncDB.login(email, pass);
      checkAndShowUser();
      loadHistory();
    }
  } catch (err) {
    errEl.className = 'auth-error';
    errEl.style.background = '';
    errEl.style.borderColor = '';
    errEl.style.color = '';
    errEl.textContent = err.message || 'Authentication failed.';
    errEl.classList.remove('hidden');
  } finally {
    btnAuth.disabled = false;
    btnAuth.textContent = originalText;
  }
}

async function handleLogout() {
  await SyncDB.logout();
  checkAndShowUser();
  loadHistory();
}

async function checkAndShowUser() {
  const user = await SyncDB.getCurrentUser();
  const outView = document.getElementById('auth-out-view');
  const inView  = document.getElementById('auth-in-view');
  const pill    = document.getElementById('sync-status-pill');
  const dot     = document.getElementById('status-dot');
  const label   = document.getElementById('status-label');

  if (user) {
    outView.classList.add('hidden');
    inView.classList.remove('hidden');
    document.getElementById('user-name').textContent  = user.username || user.email?.split('@')[0] || 'User';
    document.getElementById('user-email').textContent = user.email || '';

    dot.style.background   = '#06b6d4';
    dot.style.boxShadow    = '0 0 8px #06b6d4';
    label.textContent      = 'Cloud Synced';
    label.style.color      = '#06b6d4';
    pill.style.borderColor = 'rgba(6,182,212,.25)';
  } else {
    outView.classList.remove('hidden');
    inView.classList.add('hidden');
    dot.style.background   = '#10b981';
    dot.style.boxShadow    = '0 0 8px #10b981';
    label.textContent      = 'Local Mode';
    label.style.color      = '#10b981';
    pill.style.borderColor = 'rgba(16,185,129,.25)';
  }
}

async function loadHistory() {
  const listEl = document.getElementById('history-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="spinner" style="margin:24px auto;"></div>';

  const items = await SyncDB.getHistory();
  const countEl = document.getElementById('stat-count');
  if (countEl) countEl.textContent = items.length;

  if (items.length === 0) {
    listEl.innerHTML = '<p class="muted-text" style="text-align:center;padding:40px 0">No history yet. Solve a problem or do a calculation to see it here.</p>';
    return;
  }

  listEl.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'history-row';

    const typeChip = item.calc_type === 'simple'
      ? '<span class="chip chip-cyan" style="font-size:0.6rem;padding:2px 7px;vertical-align:middle;margin-right:6px;">CALC</span>'
      : `<span class="chip chip-dark" style="font-size:0.6rem;padding:2px 7px;vertical-align:middle;margin-right:6px;">${(item.calc_type || 'CAS').toUpperCase()}</span>`;

    row.innerHTML = `
      <div class="history-info">
        <span class="history-title">${typeChip}${item.title}</span>
        <span class="history-meta">${new Date(item.created_at).toLocaleString()}</span>
      </div>
      <div class="history-btns">
        <button class="btn btn-xs btn-ghost" data-open="${item.id}">Open</button>
        <button class="btn btn-xs btn-ghost danger" data-del="${item.id}">✕</button>
      </div>`;

    row.querySelector('[data-open]').addEventListener('click', () => {
      if (item.calc_type === 'simple') {
        // Route to simple calculator tab — nothing to "open" specifically
        switchTab('simple');
      } else {
        switchTab('calculator');
        setCalcMode(item.calc_type);
        document.querySelectorAll('.mode-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.mode === item.calc_type);
        });
        document.getElementById('math-input').value = item.expression || '';
        updatePreview();
        renderResults({
          success: true,
          result_latex: item.result_latex,
          steps: item.steps_json,
        }, item.expression, {});
      }
    });

    row.querySelector('[data-del]').addEventListener('click', async () => {
      if (!confirm('Delete this entry?')) return;
      await SyncDB.deleteCalculation(item.id);
      loadHistory();
    });

    listEl.appendChild(row);
  });
}

// ══ Utilities ═════════════════════════════════════════════════════════

function insertAtCursor(text) {
  const inp = document.getElementById('math-input');
  const s = inp.selectionStart;
  const e = inp.selectionEnd;
  inp.value = inp.value.slice(0, s) + text + inp.value.slice(e);
  // Move cursor inside parenthesis if applicable
  const newPos = text.includes('(') ? s + text.indexOf('(') + 1 : s + text.length;
  inp.setSelectionRange(newPos, newPos);
  inp.focus();
  updatePreview();
}

// Convert raw user input to approximate LaTeX for live preview
function inputToLatex(text) {
  if (!text.trim()) return '';
  let t = text
    .replace(/\*/g, ' \\cdot ')
    .replace(/pi\b/g, '\\pi')
    .replace(/\boo\b/g, '\\infty')
    .replace(/\bE\b/g, 'e')
    .replace(/sin\(/g, '\\sin(')
    .replace(/cos\(/g, '\\cos(')
    .replace(/tan\(/g, '\\tan(')
    .replace(/ln\(/g, '\\ln(')
    .replace(/log\(/g, '\\log(')
    .replace(/exp\(/g, 'e^{')
    .replace(/sqrt\(/g, '\\sqrt{')
    .replace(/\^(\w)/g, '^{$1}');
  return t;
}

function updatePreview() {
  const val = document.getElementById('math-input').value;
  const prev = document.getElementById('katex-preview');
  try {
    katex.render(inputToLatex(val) || '\\text{Enter an expression…}', prev,
      { throwOnError: false, displayMode: true });
  } catch (e) {
    prev.textContent = val;
  }
}

// Render inline $…$ patterns inside description strings
function renderInlineMath(text) {
  return text.replace(/\$([^$]+)\$/g, (_, latex) => {
    try { return katex.renderToString(latex, { throwOnError: false }); }
    catch { return latex; }
  });
}

async function postJSON(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

function shakeBorder(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = '#ef4444';
  el.style.boxShadow = '0 0 0 3px rgba(239,68,68,.2)';
  setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 1200);
}

function flashBtn(id, msg) {
  const btn = document.getElementById(id);
  if (!btn) return;
  const orig = btn.title;
  btn.title = msg;
  setTimeout(() => btn.title = orig, 1800);
}
