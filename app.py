import os
import random
import traceback
import numpy as np
import sympy as sp
from flask import Flask, request, jsonify, render_template

from math_engine import MathEngine, parse_math

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['JSON_SORT_KEYS'] = False

# ── Practice Problem Pool ──────────────────────────────────────────────────────
PRACTICE_PROBLEMS = [
    # Limits — Easy
    {
        "id": 1, "type": "limit", "difficulty": "Easy",
        "problem": "sin(x)/x", "var": "x",
        "params": {"point": "0", "direction": "both"},
        "question": "\\lim_{x \\to 0} \\frac{\\sin(x)}{x}",
        "hint": "Direct substitution gives 0/0. Apply L'Hôpital's Rule."
    },
    # Limits — Medium
    {
        "id": 2, "type": "limit", "difficulty": "Medium",
        "problem": "(exp(x) - 1 - x)/x^2", "var": "x",
        "params": {"point": "0", "direction": "both"},
        "question": "\\lim_{x \\to 0} \\frac{e^x - 1 - x}{x^2}",
        "hint": "Apply L'Hôpital's Rule twice. Both applications yield 0/0."
    },
    # Limits — Hard
    {
        "id": 3, "type": "limit", "difficulty": "Hard",
        "problem": "(1 + 1/x)^x", "var": "x",
        "params": {"point": "oo", "direction": "both"},
        "question": "\\lim_{x \\to \\infty} \\left(1 + \\frac{1}{x}\\right)^x",
        "hint": "Rewrite as e^{x \\ln(1+1/x)}, then find the limit of the exponent."
    },
    # Derivatives — Easy
    {
        "id": 4, "type": "derivative", "difficulty": "Easy",
        "problem": "x^3 - 5*x^2 + 7", "var": "x",
        "params": {"order": 1, "type": "explicit"},
        "question": "\\frac{d}{dx}\\left[x^3 - 5x^2 + 7\\right]",
        "hint": "Differentiate each term using the Power Rule: d/dx[x^n] = n x^{n-1}."
    },
    # Derivatives — Medium
    {
        "id": 5, "type": "derivative", "difficulty": "Medium",
        "problem": "x^2 * ln(x)", "var": "x",
        "params": {"order": 1, "type": "explicit"},
        "question": "\\frac{d}{dx}\\left[x^2 \\ln(x)\\right]",
        "hint": "Use the Product Rule: (uv)' = u'v + uv'. Here u = x² and v = ln(x)."
    },
    # Derivatives — Hard
    {
        "id": 6, "type": "derivative", "difficulty": "Hard",
        "problem": "sin(x^2) * exp(cos(x))", "var": "x",
        "params": {"order": 1, "type": "explicit"},
        "question": "\\frac{d}{dx}\\left[\\sin(x^2)\\, e^{\\cos(x)}\\right]",
        "hint": "Apply Product Rule then Chain Rule on each factor separately."
    },
    # Integrals — Easy
    {
        "id": 7, "type": "integral", "difficulty": "Easy",
        "problem": "3*x^2 - 4*x + 5", "var": "x",
        "params": {},
        "question": "\\int (3x^2 - 4x + 5)\\, dx",
        "hint": "Integrate term-by-term using ∫x^n dx = x^{n+1}/(n+1)."
    },
    # Integrals — Medium
    {
        "id": 8, "type": "integral", "difficulty": "Medium",
        "problem": "x * exp(x^2)", "var": "x",
        "params": {},
        "question": "\\int x\\, e^{x^2}\\, dx",
        "hint": "Use u-substitution: let u = x², then du = 2x dx."
    },
    # Integrals — Hard
    {
        "id": 9, "type": "integral", "difficulty": "Hard",
        "problem": "ln(x)", "var": "x",
        "params": {},
        "question": "\\int \\ln(x)\\, dx",
        "hint": "Use Integration by Parts with u = ln(x), dv = dx."
    },
    # Series — Easy
    {
        "id": 10, "type": "series", "difficulty": "Easy",
        "problem": "exp(x)", "var": "x",
        "params": {"point": "0", "terms": 5},
        "question": "\\text{Maclaurin series of } e^x \\text{ up to 5 terms}",
        "hint": "Every derivative of e^x at x=0 equals 1. Use the formula sum f^(n)(0)/n! * x^n."
    },
    # ODE — Medium
    {
        "id": 11, "type": "ode", "difficulty": "Medium",
        "problem": "y' - 2*y = exp(x)", "var": "x",
        "params": {},
        "question": "\\text{Solve: } y' - 2y = e^x",
        "hint": "First-order linear ODE. Integrating factor: e^{-2x}."
    },
]

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route('/')
def home():
    return render_template('index.html')


@app.route('/api/solve', methods=['POST'])
def api_solve():
    data = request.get_json(force=True) or {}
    calc_type = data.get('calc_type', 'derivative')
    expression = data.get('expression', '').strip()
    var = data.get('var', 'x')
    params = data.get('params', {})

    if not expression:
        return jsonify({'success': False, 'error': 'Expression is required.'}), 400

    try:
        if calc_type == 'derivative':
            if params.get('type') == 'implicit':
                dep_var = params.get('dep_var', 'y')
                res = MathEngine.get_implicit_derivative(expression, var, dep_var)
            else:
                order = int(params.get('order', 1))
                res = MathEngine.get_derivative(expression, var, order)

        elif calc_type == 'integral':
            lower = params.get('lower') or None
            upper = params.get('upper') or None
            res = MathEngine.get_integral(expression, var, lower, upper)

        elif calc_type == 'limit':
            point = params.get('point', '0')
            direction = params.get('direction', 'both')
            res = MathEngine.get_limit(expression, var, point, direction)

        elif calc_type == 'series':
            point = params.get('point', '0')
            terms = int(params.get('terms', 6))
            res = MathEngine.get_series(expression, var, point, terms)

        elif calc_type == 'ode':
            res = MathEngine.get_ode(expression, dep_var_str='y', ind_var_str='x')

        elif calc_type == 'vector_calc':
            vector_type = params.get('vector_type', 'gradient')
            res = MathEngine.get_vector_calc(expression, vector_type)

        else:
            return jsonify({'success': False, 'error': f'Unknown calc_type: {calc_type}'}), 400

        return jsonify(res)

    except Exception as err:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(err)}), 500


@app.route('/api/plot', methods=['POST'])
def api_plot():
    """Return numeric coordinates for Plotly charts (2-D or 3-D)."""
    data = request.get_json(force=True) or {}
    expression_str = data.get('expression', '').strip()
    var_str = data.get('var', 'x')
    var2_str = data.get('var2', 'y')
    dim = int(data.get('dimensions', 2))

    if not expression_str:
        return jsonify({'success': False, 'error': 'Expression required.'}), 400

    try:
        expr = parse_math(expression_str)

        if dim == 2:
            x_sym = sp.Symbol(var_str)
            x_min = float(data.get('x_min', -10))
            x_max = float(data.get('x_max', 10))
            xs = np.linspace(x_min, x_max, 400)
            f = sp.lambdify(x_sym, expr, modules=['numpy'])

            ys = []
            for xv in xs:
                try:
                    yv = float(f(xv))
                    ys.append(None if (np.isnan(yv) or np.isinf(yv)) else yv)
                except Exception:
                    ys.append(None)

            return jsonify({'success': True, 'dimension': 2,
                            'x': xs.tolist(), 'y': ys})

        elif dim == 3:
            x_sym = sp.Symbol(var_str)
            y_sym = sp.Symbol(var2_str)
            x_min = float(data.get('x_min', -5))
            x_max = float(data.get('x_max', 5))
            y_min = float(data.get('y_min', -5))
            y_max = float(data.get('y_max', 5))

            xr = np.linspace(x_min, x_max, 50)
            yr = np.linspace(y_min, y_max, 50)
            X, Y = np.meshgrid(xr, yr)
            f = sp.lambdify((x_sym, y_sym), expr, modules=['numpy'])

            try:
                Z_raw = f(X, Y).astype(float)
                Z_raw[~np.isfinite(Z_raw)] = np.nan
                Z = [[None if np.isnan(Z_raw[i, j]) else float(Z_raw[i, j])
                       for j in range(len(xr))]
                      for i in range(len(yr))]
            except Exception:
                Z = [[None] * len(xr) for _ in range(len(yr))]

            return jsonify({'success': True, 'dimension': 3,
                            'x': xr.tolist(), 'y': yr.tolist(), 'z': Z})

        return jsonify({'success': False, 'error': 'Invalid dimensions.'}), 400

    except Exception as err:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(err)}), 500


@app.route('/api/practice', methods=['GET'])
def api_practice():
    diff_filter = request.args.get('difficulty', '').strip()
    type_filter = request.args.get('type', '').strip()

    pool = PRACTICE_PROBLEMS
    if diff_filter:
        pool = [p for p in pool if p['difficulty'].lower() == diff_filter.lower()]
    if type_filter:
        pool = [p for p in pool if p['type'].lower() == type_filter.lower()]

    if not pool:
        return jsonify({'success': False, 'error': 'No problems match filters.'}), 404

    # Use Python's random — avoids numpy serialization issues
    selected = random.choice(pool)
    return jsonify({'success': True, 'problem': selected})


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
