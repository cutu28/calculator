import sympy as sp
import numpy as np
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor
from sympy.integrals.manualintegrate import integral_steps, manualintegrate
import traceback

# Setup robust parser transformations
SYM_TRANSFORMATIONS = standard_transformations + (implicit_multiplication_application, convert_xor)

def parse_math(expression_str):
    """
    Parses a user input math string into a SymPy expression.
    Handles implicit multiplication (2x -> 2*x) and XOR powers (x^2 -> x**2).
    """
    # Clean input
    expr_str = expression_str.strip()
    # Replace common notation
    expr_str = expr_str.replace("sin^2", "(sin)**2")
    expr_str = expr_str.replace("cos^2", "(cos)**2")
    expr_str = expr_str.replace("tan^2", "(tan)**2")
    return parse_expr(expr_str, transformations=SYM_TRANSFORMATIONS)

class MathEngine:
    @staticmethod
    def get_derivative(expr_str, var_str="x", order=1):
        try:
            var = sp.Symbol(var_str)
            expr = parse_math(expr_str)
            
            steps = []
            current_expr = expr
            final_deriv = expr
            
            # Recursive derivative step tracer
            def trace_diff(e, diff_var):
                # Basic cases
                if not e.has(diff_var):
                    return sp.Integer(0), [{"desc": f"The term ${sp.latex(e)}$ contains no ${sp.latex(diff_var)}$, so its derivative is constant: $0$.", "latex": "0"}]
                if e == diff_var:
                    return sp.Integer(1), [{"desc": f"Apply variable rule: $\\frac{{d}}{{d{sp.latex(diff_var)}}}({sp.latex(diff_var)}) = 1$", "latex": "1"}]
                
                # Sum Rule
                if isinstance(e, sp.Add):
                    terms = e.args
                    sub_derivs = []
                    sub_steps = []
                    sub_steps.append({
                        "desc": "Apply the Sum/Difference Rule: differentiate each term individually.",
                        "latex": f"\\frac{{d}}{{d{sp.latex(diff_var)}}} ({sp.latex(e)}) = " + " + ".join([f"\\frac{{d}}{{d{sp.latex(diff_var)}}} ({sp.latex(t)})" for t in terms])
                    })
                    for t in terms:
                        t_deriv, t_steps = trace_diff(t, diff_var)
                        sub_derivs.append(t_deriv)
                        for ts in t_steps:
                            sub_steps.append({
                                "desc": f"For term ${sp.latex(t)}$: " + ts["desc"],
                                "latex": ts["latex"]
                            })
                    combined_deriv = sum(sub_derivs)
                    sub_steps.append({
                        "desc": "Combine the results of all term derivatives.",
                        "latex": sp.latex(combined_deriv)
                    })
                    return combined_deriv, sub_steps
                
                # Product Rule (Mul)
                if isinstance(e, sp.Mul):
                    # Check for constants
                    coeff, non_coeff = e.as_coeff_Mul()
                    if coeff != 1:
                        # Constant multiple rule
                        sub_deriv, sub_steps = trace_diff(non_coeff, diff_var)
                        res_steps = [{
                            "desc": f"Pull out the constant factor ${sp.latex(coeff)}$: $\\frac{{d}}{{d{sp.latex(diff_var)}}} (c \\cdot f) = c \\cdot \\frac{{d}}{{d{sp.latex(diff_var)}}} (f)$",
                            "latex": f"{sp.latex(coeff)} \\cdot \\frac{{d}}{{d{sp.latex(diff_var)}}} ({sp.latex(non_coeff)})"
                        }]
                        for s in sub_steps:
                            res_steps.append({
                                "desc": s["desc"],
                                "latex": f"{sp.latex(coeff)} \\cdot ({s['latex']})"
                            })
                        final_res = coeff * sub_deriv
                        res_steps.append({
                            "desc": "Simplify the products.",
                            "latex": sp.latex(final_res)
                        })
                        return final_res, res_steps
                    
                    # Group into u_fac * w_fac
                    args = e.args
                    u_fac = args[0]
                    w_fac = sp.Mul(*args[1:])
                    
                    du, steps_u = trace_diff(u_fac, diff_var)
                    dw, steps_w = trace_diff(w_fac, diff_var)
                    
                    res_steps = [{
                        "desc": f"Apply the Product Rule: $\\frac{{d}}{{d{sp.latex(diff_var)}}} (u \\cdot w) = u \\frac{{dw}}{{d{sp.latex(diff_var)}}} + w \\frac{{du}}{{d{sp.latex(diff_var)}}}$ where $u = {sp.latex(u_fac)}$ and $w = {sp.latex(w_fac)}$.",
                        "latex": f"({sp.latex(u_fac)}) \\cdot \\frac{{d}}{{d{sp.latex(diff_var)}}} ({sp.latex(w_fac)}) + ({sp.latex(w_fac)}) \\cdot \\frac{{d}}{{d{sp.latex(diff_var)}}} ({sp.latex(u_fac)})"
                    }]
                    
                    for s in steps_u:
                        res_steps.append({
                            "desc": f"Differentiate $u = {sp.latex(u_fac)}$: " + s["desc"],
                            "latex": f"\\text{{d/d}}{sp.latex(diff_var)} ({sp.latex(u_fac)}) = {s['latex']}"
                        })
                    for s in steps_w:
                        res_steps.append({
                            "desc": f"Differentiate $w = {sp.latex(w_fac)}$: " + s["desc"],
                            "latex": f"\\text{{d/d}}{sp.latex(diff_var)} ({sp.latex(w_fac)}) = {s['latex']}"
                        })
                        
                    final_res = u_fac * dw + w_fac * du
                    res_steps.append({
                        "desc": "Sum the terms and simplify.",
                        "latex": sp.latex(final_res)
                    })
                    return final_res, res_steps

                # Power Rule (Pow)
                if isinstance(e, sp.Pow):
                    base, exponent = e.args
                    # Case 1: constant exponent
                    if not exponent.has(diff_var):
                        if base == diff_var:
                            deriv = exponent * (diff_var ** (exponent - 1))
                            return deriv, [{
                                "desc": f"Apply the Power Rule: $\\frac{{d}}{{d{sp.latex(diff_var)}}} ({sp.latex(diff_var)}^n) = n {sp.latex(diff_var)}^{{n-1}}$, where $n = {sp.latex(exponent)}$.",
                                "latex": sp.latex(deriv)
                            }]
                        else:
                            # Chain Rule
                            db, steps_b = trace_diff(base, diff_var)
                            outer_deriv = exponent * (base ** (exponent - 1))
                            final_res = outer_deriv * db
                            res_steps = [{
                                "desc": f"Apply the Power Rule with Chain Rule: $\\frac{{d}}{{d{sp.latex(diff_var)}}} (u^n) = n u^{{n-1}} \\cdot \\frac{{du}}{{d{sp.latex(diff_var)}}}$ where $u = {sp.latex(base)}$ and $n = {sp.latex(exponent)}$.",
                                "latex": f"{sp.latex(exponent)} ({sp.latex(base)})^{{{sp.latex(exponent - 1)}}} \\cdot \\frac{{d}}{{d{sp.latex(diff_var)}}} ({sp.latex(base)})"
                            }]
                            for s in steps_b:
                                res_steps.append({
                                    "desc": f"Differentiate inner function $u = {sp.latex(base)}$: " + s["desc"],
                                    "latex": s["latex"]
                                })
                            res_steps.append({
                                "desc": "Multiply the outer and inner derivatives.",
                                "latex": sp.latex(final_res)
                            })
                            return final_res, res_steps
                    
                    # Case 2: variable exponent, constant base (a^u)
                    elif not base.has(diff_var):
                        de, steps_e = trace_diff(exponent, diff_var)
                        outer_deriv = (base ** exponent) * sp.log(base)
                        final_res = outer_deriv * de
                        res_steps = [{
                            "desc": f"Apply the Exponential Rule with Chain Rule: $\\frac{{d}}{{d{sp.latex(diff_var)}}} (a^u) = a^u \\ln(a) \\cdot \\frac{{du}}{{d{sp.latex(diff_var)}}}$ where $a = {sp.latex(base)}$ and $u = {sp.latex(exponent)}$.",
                            "latex": f"{sp.latex(base)}^{{{sp.latex(exponent)}}} \\ln({sp.latex(base)}) \\cdot \\frac{{d}}{{d{sp.latex(diff_var)}}} ({sp.latex(exponent)})"
                        }]
                        for s in steps_e:
                            res_steps.append({
                                "desc": f"Differentiate exponent $u = {sp.latex(exponent)}$: " + s["desc"],
                                "latex": s["latex"]
                            })
                        res_steps.append({
                            "desc": "Formulate derivative.",
                            "latex": sp.latex(final_res)
                        })
                        return final_res, res_steps
                    
                    # Case 3: variable base and variable exponent (f^g = exp(g * ln(f)))
                    else:
                        rewritten = sp.exp(exponent * sp.log(base))
                        res_deriv, res_steps = trace_diff(rewritten, diff_var)
                        prefix_steps = [{
                            "desc": f"Differentiate variable base and exponent using logarithmic rewriting: $f^g = e^{{g \\ln(f)}}$.",
                            "latex": f"\\frac{{d}}{{d{sp.latex(diff_var)}}} \\left(e^{{{sp.latex(exponent * sp.log(base))}}}\\right)"
                        }]
                        return res_deriv, prefix_steps + res_steps

                # Standard Functions
                if isinstance(e, (sp.sin, sp.cos, sp.tan, sp.cot, sp.sec, sp.csc, sp.exp, sp.log, sp.asin, sp.acos, sp.atan, sp.sinh, sp.cosh, sp.tanh)):
                    arg = e.args[0]
                    # Map standard derivatives
                    func_class = e.__class__
                    
                    # Dummy variable differentiation
                    dummy = sp.Symbol("_u")
                    dummy_deriv = sp.diff(func_class(dummy), dummy).subs(dummy, arg)
                    
                    if arg == diff_var:
                        return dummy_deriv, [{
                            "desc": f"Standard derivative: derivative of ${func_class.__name__}({sp.latex(diff_var)})$ is ${sp.latex(dummy_deriv)}$.",
                            "latex": sp.latex(dummy_deriv)
                        }]
                    else:
                        darg, steps_arg = trace_diff(arg, diff_var)
                        final_res = dummy_deriv * darg
                        res_steps = [{
                            "desc": f"Apply Chain Rule: derivative of ${func_class.__name__}(u)$ is $\\frac{{d}}{{du}}[{func_class.__name__}(u)] \\cdot \\frac{{du}}{{d{sp.latex(diff_var)}}}$ where $u = {sp.latex(arg)}$.",
                            "latex": f"{sp.latex(dummy_deriv)} \\cdot \\frac{{d}}{{d{sp.latex(diff_var)}}} ({sp.latex(arg)})"
                        }]
                        for s in steps_arg:
                            res_steps.append({
                                "desc": f"Differentiate inner argument $u = {sp.latex(arg)}$: " + s["desc"],
                                "latex": s["latex"]
                            })
                        res_steps.append({
                            "desc": "Combine outer and inner derivatives.",
                            "latex": sp.latex(final_res)
                        })
                        return final_res, res_steps

                # Fallback
                fallback_deriv = sp.diff(e, diff_var)
                return fallback_deriv, [{
                    "desc": f"Differentiate standard expression of type ${e.__class__.__name__}$.",
                    "latex": sp.latex(fallback_deriv)
                }]
            
            # Perform differentiation order times
            for o in range(1, order + 1):
                deriv_val, order_steps = trace_diff(current_expr, var)
                steps.append({
                    "title": f"Order {o} Derivative Steps",
                    "step_nodes": order_steps
                })
                current_expr = deriv_val
                final_deriv = deriv_val
            
            # Simplify final response
            term_simplified = sp.simplify(final_deriv)
            if term_simplified != final_deriv:
                steps.append({
                    "title": "Simplification",
                    "step_nodes": [{
                        "desc": "Simplify the derivative expression.",
                        "latex": sp.latex(term_simplified)
                    }]
                })
                final_deriv = term_simplified

            return {
                "success": True,
                "result_latex": sp.latex(final_deriv),
                "result_raw": str(final_deriv),
                "steps": steps
            }
        except Exception as err:
            traceback.print_exc()
            return {"success": False, "error": str(err)}

    @staticmethod
    def get_implicit_derivative(expr_str, var_str="x", dep_var_str="y"):
        try:
            x = sp.Symbol(var_str)
            y = sp.Symbol(dep_var_str)
            # Parse equation
            if "=" in expr_str:
                lhs_str, rhs_str = expr_str.split("=")
                lhs = parse_math(lhs_str)
                rhs = parse_math(rhs_str)
                F = lhs - rhs
            else:
                F = parse_math(expr_str)
            
            steps = []
            steps.append({
                "title": "Setup Equation",
                "step_nodes": [
                    {
                        "desc": f"Express Eq as a single function $F({var_str}, {dep_var_str}) = 0$ by pushing all terms to the left:",
                        "latex": f"F({var_str}, {dep_var_str}) = {sp.latex(F)} = 0"
                    },
                    {
                        "desc": f"The formula for implicit differentiation is: $\\frac{{d{dep_var_str}}}{{d{var_str}}} = -\\frac{{F_{var_str}}}{{F_{dep_var_str}}}$, where $F_{var_str} = \\frac{{\\partial F}}{{\\partial {var_str}}}$ and $F_{dep_var_str} = \\frac{{\\partial F}}{{\\partial {dep_var_str}}}$.",
                        "latex": f"\\frac{{d{dep_var_str}}}{{d{var_str}}} = -\\frac{{\\partial F / \\partial {var_str}}}{{\\partial F / \\partial {dep_var_str}}}"
                    }
                ]
            })
            
            # Part 1: Partial w.r.t x
            Fx = sp.diff(F, x)
            steps.append({
                "title": f"Step 1: Compute Partial Derivative $F_{var_str}$",
                "step_nodes": [
                    {
                        "desc": f"Differentiate $F$ with respect to ${var_str}$, treating ${dep_var_str}$ as a constant:",
                        "latex": f"F_{var_str} = \\frac{{\\partial}}{{\\partial {var_str}}} \\left({sp.latex(F)}\\right) = {sp.latex(Fx)}"
                    }
                ]
            })
            
            # Part 2: Partial w.r.t y
            Fy = sp.diff(F, y)
            steps.append({
                "title": f"Step 2: Compute Partial Derivative $F_{dep_var_str}$",
                "step_nodes": [
                    {
                        "desc": f"Differentiate $F$ with respect to ${dep_var_str}$, treating ${var_str}$ as a constant:",
                        "latex": f"F_{dep_var_str} = \\frac{{\\partial}}{{\\partial {dep_var_str}}} \\left({sp.latex(F)}\\right) = {sp.latex(Fy)}"
                    }
                ]
            })
            
            # Part 3: Combine
            result = -Fx / Fy
            simplified_result = sp.simplify(result)
            steps.append({
                "title": "Step 3: Apply the Formula",
                "step_nodes": [
                    {
                        "desc": f"Substitute $F_{var_str}$ and $F_{dep_var_str}$ into the formula:",
                        "latex": f"\\frac{{d{dep_var_str}}}{{d{var_str}}} = -\\frac{{{sp.latex(Fx)}}}{{{sp.latex(Fy)}}}"
                    },
                    {
                        "desc": "Simplify the resulting expression:",
                        "latex": f"\\frac{{d{dep_var_str}}}{{d{var_str}}} = {sp.latex(simplified_result)}"
                    }
                ]
            })
            
            return {
                "success": True,
                "result_latex": sp.latex(simplified_result),
                "result_raw": str(simplified_result),
                "steps": steps
            }
        except Exception as err:
            traceback.print_exc()
            return {"success": False, "error": str(err)}

    @staticmethod
    def get_integral(expr_str, var_str="x", lower=None, upper=None):
        try:
            var = sp.Symbol(var_str)
            expr = parse_math(expr_str)
            
            # Get manual steps if possible
            raw_rules = None
            try:
                raw_rules = integral_steps(expr, var)
            except Exception as e:
                print("manualintegrate.integral_steps failed:", e)
                
            steps = []
            
            def format_rules(rule):
                if rule is None:
                    return []
                name = rule.__class__.__name__
                nodes = []
                
                if name == 'ConstantRule':
                    nodes.append({
                        "desc": f"The integral of a constant ${sp.latex(rule.integrand)}$ with respect to ${sp.latex(var)}$ is $c \\cdot {sp.latex(var)}$:",
                        "latex": f"\\int {sp.latex(rule.integrand)} d{sp.latex(var)} = {sp.latex(rule.integrand * var)}"
                    })
                elif name == 'ConstantTimesRule':
                    c = rule.constant
                    other = rule.other
                    nodes.append({
                        "desc": f"Pull out the constant factor ${sp.latex(c)}$:",
                        "latex": f"\\int {sp.latex(rule.integrand)} d{sp.latex(var)} = {sp.latex(c)} \\int {sp.latex(other)} d{sp.latex(var)}"
                    })
                    nodes.extend(format_rules(rule.substep))
                elif name == 'PowerRule':
                    b = rule.base
                    e = rule.exp
                    antideriv = (b ** (e + 1)) / (e + 1)
                    nodes.append({
                        "desc": f"Apply the Power Rule: $\\int u^n du = \\frac{{u^{{n+1}}}}{{n+1}}$ where $n = {sp.latex(e)}$:",
                        "latex": f"\\int {sp.latex(rule.integrand)} d{sp.latex(var)} = {sp.latex(antideriv)}"
                    })
                elif name == 'AddRule':
                    substeps = rule.substeps
                    nodes.append({
                        "desc": "Apply the Sum Rule to integrate term-by-term:",
                        "latex": f"\\int \\left({sp.latex(rule.integrand)}\\right) d{sp.latex(var)} = " + " + ".join([f"\\int {sp.latex(s.integrand)} d{sp.latex(var)}" for s in substeps])
                    })
                    for idx, s in enumerate(substeps):
                        nodes.append({
                            "desc": f"**Integrate term {idx+1}:** ${sp.latex(s.integrand)}$",
                            "latex": ""
                        })
                        nodes.extend(format_rules(s))
                elif name == 'URule':
                    u_var = rule.u_var
                    u_func = rule.u_func
                    substep = rule.substep
                    du_dx = sp.diff(u_func, var)
                    nodes.append({
                        "desc": f"Use u-substitution: let $u = {sp.latex(u_func)}$. Then, $du = {sp.latex(du_dx)} d{sp.latex(var)} \\implies d{sp.latex(var)} = \\frac{{du}}{{{sp.latex(du_dx)}}}$.",
                        "latex": f"\\text{{Substitute }} u = {sp.latex(u_func)}"
                    })
                    nodes.append({
                        "desc": f"The integral transforms to in terms of $u$:",
                        "latex": f"\\int {sp.latex(substep.integrand)} d{sp.latex(u_var)}"
                    })
                    # Format sub integral steps
                    sub_nodes = format_rules(substep)
                    # Relabel u_var to u in latex output to be human-friendly
                    for sn in sub_nodes:
                        sn["latex"] = sn["latex"].replace(str(u_var), "u")
                        sn["desc"] = sn["desc"].replace(str(u_var), "u")
                    nodes.extend(sub_nodes)
                    
                    # Back substitute
                    sub_res = manualintegrate(substep.integrand, u_var)
                    back_subbed = sub_res.subs(u_var, u_func)
                    nodes.append({
                        "desc": f"Replace $u$ with the original variable $u = {sp.latex(u_func)}$:",
                        "latex": f"{sp.latex(back_subbed)}"
                    })
                elif name == 'PartsRule':
                    u = rule.u
                    dv = rule.dv
                    v_step = rule.v_step
                    substep = rule.substep # integral of v * du
                    v = manualintegrate(dv, var)
                    du = sp.diff(u, var)
                    nodes.append({
                        "desc": f"Apply Integration by Parts: $\\int u \\, dv = uv - \\int v \\, du$. Let $u = {sp.latex(u)}$ and $dv = {sp.latex(dv)} d{sp.latex(var)}$.",
                        "latex": f"u = {sp.latex(u)}, \\quad dv = {sp.latex(dv)}"
                    })
                    nodes.append({
                        "desc": f"Differentiate $u$ to get $du = {sp.latex(du)} d{sp.latex(var)}$, and integrate $dv$ to find $v$:",
                        "latex": f"du = {sp.latex(du)}, \\quad v = {sp.latex(v)}"
                    })
                    nodes.append({
                        "desc": f"Now insert into parts formula $uv - \\int v \\, du$:",
                        "latex": f"{sp.latex(u)} \\cdot {sp.latex(v)} - \\int \\left({sp.latex(v * du)}\\right) d{sp.latex(var)}"
                    })
                    nodes.extend(format_rules(substep))
                elif name == 'RewriteRule':
                    nodes.append({
                        "desc": f"Rewrite the integrand algebraically:",
                        "latex": f"{sp.latex(rule.integrand)} \\to {sp.latex(rule.rewritten)}"
                    })
                    nodes.extend(format_rules(rule.substep))
                elif name in ('SinRule', 'CosRule', 'ExpRule', 'LogRule', 'TanRule', 'Sec2Rule', 'Csc2Rule', 'SecTanRule', 'CscCotRule', 'ArctanRule', 'ArcsinRule'):
                    dummy_sym = sp.Symbol('u')
                    # Find rule class
                    rule_func_name = name.replace("Rule", "").lower()
                    if rule_func_name == 'sec2': rule_func_name = 'sec' # rough fix
                    antideriv = manualintegrate(rule.integrand, var)
                    nodes.append({
                        "desc": f"Apply standard trigonometric/elementary integration formula:",
                        "latex": f"\\int {sp.latex(rule.integrand)} d{sp.latex(var)} = {sp.latex(antideriv)}"
                    })
                else:
                    antideriv = manualintegrate(rule.integrand, var)
                    nodes.append({
                        "desc": f"Standard integration step for ${name}$:",
                        "latex": f"\\int {sp.latex(rule.integrand)} d{sp.latex(var)} = {sp.latex(antideriv)}"
                    })
                return nodes

            if raw_rules:
                steps_list = format_rules(raw_rules)
                steps.append({
                    "title": "Indefinite Integration Steps",
                    "step_nodes": steps_list
                })
            else:
                steps.append({
                    "title": "Direct Integration",
                    "step_nodes": [{
                        "desc": "Integrate directly using standard algorithms:",
                        "latex": f"\\int {sp.latex(expr)} d{sp.latex(var)}"
                    }]
                })
            
            # Compute analytical antiderivative
            antiderivative = sp.integrate(expr, var)
            
            # Handle Definite Integral if limits are supplied
            if lower is not None and upper is not None:
                lower_val = parse_math(lower)
                upper_val = parse_math(upper)
                
                definite_val = sp.integrate(expr, (var, lower_val, upper_val))
                def_latex = sp.latex(definite_val)
                
                # Check for numerical approximations
                try:
                    num_val = float(definite_val.evalf())
                except:
                    num_val = None
                
                # Evaluate F(b) - F(a) step
                Fb = antiderivative.subs(var, upper_val)
                Fa = antiderivative.subs(var, lower_val)
                
                steps.append({
                    "title": "Evaluate Limits of Integration",
                    "step_nodes": [
                        {
                            "desc": f"Apply the Fundamental Theorem of Calculus: $\\int_a^b f(x)dx = F(b) - F(a)$ where $F(x) = {sp.latex(antiderivative)}$.",
                            "latex": f"\\left[ {sp.latex(antiderivative)} \\right]_{{{sp.latex(lower_val)}}}^{{{sp.latex(upper_val)}}}"
                        },
                        {
                            "desc": f"Evaluate $F({sp.latex(upper_val)}) = {sp.latex(Fb)}$ and $F({sp.latex(lower_val)}) = {sp.latex(Fa)}$:",
                            "latex": f"({sp.latex(Fb)}) - ({sp.latex(Fa)})"
                        },
                        {
                            "desc": "Calculate final definite value:",
                            "latex": f"{sp.latex(definite_val)}"
                        }
                    ]
                })
                
                return {
                    "success": True,
                    "result_latex": def_latex,
                    "result_raw": str(definite_val),
                    "result_numeric": num_val,
                    "steps": steps
                }
            
            # Simple indefinite case
            final_res = antiderivative
            return {
                "success": True,
                "result_latex": f"{sp.latex(final_res)} + C",
                "result_raw": str(final_res),
                "steps": steps
            }
        except Exception as err:
            traceback.print_exc()
            return {"success": False, "error": str(err)}

    @staticmethod
    def get_limit(expr_str, var_str="x", point_str="0", direction="both"):
        try:
            var = sp.Symbol(var_str)
            expr = parse_math(expr_str)
            point = parse_math(point_str)
            
            # Evaluate using sympy API
            dir_symbol = "+-" if direction == "both" else ("+" if direction == "right" else "-")
            
            # Steps tracer for limits
            steps = []
            
            # Try direct substitution first
            direct_sub = None
            has_indeterminate = False
            sub_nodes = []
            
            try:
                direct_sub = expr.subs(var, point)
                sub_nodes.append({
                    "desc": f"Try direct substitution of ${var_str} = {sp.latex(point)}$ into the expression:",
                    "latex": f"{sp.latex(expr.subs(var, point))}"
                })
                if direct_sub.is_infinite or direct_sub == sp.nan or direct_sub == sp.zoo:
                    has_indeterminate = True
            except Exception:
                has_indeterminate = True
                
            # Perform calculation
            if direction == "both":
                lim_val = sp.limit(expr, var, point)
            else:
                lim_val = sp.limit(expr, var, point, dir=direction)
                
            if has_indeterminate:
                # Explain indeterminate form & L'Hopital rule
                num, denom = sp.fraction(expr)
                if denom != 1:
                    num_sub = num.subs(var, point)
                    denom_sub = denom.subs(var, point)
                    
                    sub_nodes.append({
                        "desc": f"Direct substitution results in an indeterminate form (such as $0/0$ or $\\infty/\\infty$). We apply L'Hôpital's Rule.",
                        "latex": f"\\lim_{{{var_str} \\to {sp.latex(point)}}} \\frac{{{sp.latex(num)}}}{{{sp.latex(denom)}}} = \\lim_{{{var_str} \\to {sp.latex(point)}}} \\frac{{\\frac{{d}}{{d{var_str}}}[{sp.latex(num)}]}}{{\\frac{{d}}{{d{var_str}}}[{sp.latex(denom)}]}}"
                    })
                    
                    diff_num = sp.diff(num, var)
                    diff_denom = sp.diff(denom, var)
                    
                    sub_nodes.append({
                        "desc": f"Compute derivatives: $\\frac{{d}}{{d{var_str}}}[{sp.latex(num)}] = {sp.latex(diff_num)}$ and $\\frac{{d}}{{d{var_str}}}[{sp.latex(denom)}] = {sp.latex(diff_denom)}$:",
                        "latex": f"\\lim_{{{var_str} \\to {sp.latex(point)}}} \\frac{{{sp.latex(diff_num)}}}{{{sp.latex(diff_denom)}}}"
                    })
                    
                    # Try limit of the derivatives ratio
                    lim_ratio_sub = (diff_num / diff_denom).subs(var, point)
                    sub_nodes.append({
                        "desc": "Substitute point into differentiated ratio:",
                        "latex": f"{sp.latex(lim_ratio_sub)}"
                    })
                else:
                    sub_nodes.append({
                        "desc": f"Expression has indeterminate format, evaluate limit using expansion or properties:",
                        "latex": f"\\lim_{{{var_str} \\to {sp.latex(point)}}} {sp.latex(expr)}"
                    })
            else:
                sub_nodes.append({
                    "desc": f"Direct substitution gives a defined real value. Hence, the limit matches the evaluation:",
                    "latex": f"{sp.latex(lim_val)}"
                })
                
            steps.append({
                "title": "Limit Resolution Steps",
                "step_nodes": sub_nodes
            })
            
            return {
                "success": True,
                "result_latex": sp.latex(lim_val),
                "result_raw": str(lim_val),
                "steps": steps
            }
        except Exception as err:
            traceback.print_exc()
            return {"success": False, "error": str(err)}

    @staticmethod
    def get_series(expr_str, var_str="x", point_str="0", num_terms=6):
        try:
            var = sp.Symbol(var_str)
            expr = parse_math(expr_str)
            point = parse_math(point_str)
            
            # Generate Taylor steps
            steps = []
            term_nodes = []
            
            # Show Taylor formula
            term_nodes.append({
                "desc": f"Taylor expansion formula of $f({var_str})$ around ${var_str} = a$ up to order $N-1$ is: $f(x) \\approx \\sum_{{n=0}}^{{N-1}} \\frac{{f^{(n)}(a)}}{{n!}} (x-a)^n$.",
                "latex": ""
            })
            
            current_deriv = expr
            terms_sum = []
            for n in range(num_terms):
                deriv_value = current_deriv.subs(var, point)
                fact = sp.factorial(n)
                term = (deriv_value / fact) * ((var - point) ** n)
                terms_sum.append(term)
                
                term_nodes.append({
                    "desc": f"Coefficient $n={n}$: Derivative $f^{{({n})}}({sp.latex(point)}) = {sp.latex(deriv_value)}$. Term is $\\frac{{f^{{({n})}}({sp.latex(point)})}}{{{n}!}} (x - {sp.latex(point)})^{n}$:",
                    "latex": f"\\text{{Term }} = {sp.latex(term)}"
                })
                
                current_deriv = sp.diff(current_deriv, var)
            
            total_sum = sum(terms_sum)
            term_nodes.append({
                "desc": "Sum up all evaluated Taylor terms:",
                "latex": f"{sp.latex(total_sum)} + O((x - {sp.latex(point)})^{num_terms})"
            })
            
            steps.append({
                "title": f"Taylor Series Expansion around x = {point_str}",
                "step_nodes": term_nodes
            })
            
            return {
                "success": True,
                "result_latex": sp.latex(total_sum),
                "result_raw": str(total_sum),
                "steps": steps
            }
        except Exception as err:
            traceback.print_exc()
            return {"success": False, "error": str(err)}

    @staticmethod
    def get_ode(eq_str, dep_var_str="y", ind_var_str="x"):
        try:
            x = sp.Symbol(ind_var_str)
            y = sp.Function(dep_var_str)(x)
            
            # parse equation
            # Assume user types standard y' as derivative.
            # We rewrite string: y' -> diff(y, x), y'' -> diff(y, x, x)
            safe_str = eq_str
            safe_str = safe_str.replace("y''", f"diff({dep_var_str}({ind_var_str}), {ind_var_str}, {ind_var_str})")
            safe_str = safe_str.replace("y'", f"diff({dep_var_str}({ind_var_str}), {ind_var_str})")
            safe_str = safe_str.replace("y", f"{dep_var_str}({ind_var_str})")
            
            if "=" in safe_str:
                lhs_str, rhs_str = safe_str.split("=")
                lhs = parse_expr(lhs_str, local_dict={dep_var_str: sp.Function(dep_var_str), ind_var_str: x})
                rhs = parse_expr(rhs_str, local_dict={dep_var_str: sp.Function(dep_var_str), ind_var_str: x})
                eq = sp.Eq(lhs, rhs)
            else:
                expr = parse_expr(safe_str, local_dict={dep_var_str: sp.Function(dep_var_str), ind_var_str: x})
                eq = sp.Eq(expr, 0)
                
            sol = sp.dsolve(eq, y)
            sol_latex = sp.latex(sol)
            
            steps = []
            # Classify ODE and create structured steps
            ode_classification = sp.ode.classify_ode(eq, y)
            class_desc = ode_classification[0] if ode_classification else "Unknown Order ODE"
            
            steps.append({
                "title": "ODE Classification",
                "step_nodes": [
                    {
                        "desc": f"Identify ODE type: **{class_desc}**",
                        "latex": f"\\text{{Equation: }} {sp.latex(eq)}"
                    }
                ]
            })
            
            # Basic separable case explanation
            if "separable" in class_desc:
                steps.append({
                    "title": "Separable ODE Methodology",
                    "step_nodes": [
                        {
                            "desc": "1. Separate variables: isolate terms of $y$ on LHS and terms of $x$ on RHS.",
                            "latex": "\\int g(y) dy = \\int h(x) dx"
                        },
                        {
                            "desc": "2. Integrate both sides and combine constants of integration.",
                            "latex": ""
                        },
                        {
                            "desc": "3. Solve for $y(x)$ to get explicit solution:",
                            "latex": sol_latex
                        }
                    ]
                })
            else:
                steps.append({
                    "title": "General Solver Resolution",
                    "step_nodes": [
                        {
                            "desc": f"Apply SymPy symbolic ODE solving rules for {class_desc}:",
                            "latex": sol_latex
                        }
                    ]
                })
                
            return {
                "success": True,
                "result_latex": sol_latex,
                "result_raw": str(sol),
                "steps": steps
            }
        except Exception as err:
            traceback.print_exc()
            return {"success": False, "error": str(err)}

    @staticmethod
    def get_vector_calc(expr_str, type_str="gradient"):
        try:
            x, y, z = sp.symbols('x y z')
            # For gradient of scalar field F
            if type_str == "gradient":
                F = parse_math(expr_str)
                grad = [sp.diff(F, var) for var in (x, y, z)]
                grad_vector = sp.Matrix(grad)
                
                steps = []
                steps.append({
                    "title": "Gradient Definition",
                    "step_nodes": [
                        {
                            "desc": "The gradient of a scalar field $f(x, y, z)$ is the vector of its partial derivatives $\\nabla f = \\left[ \\frac{\\partial f}{\\partial x}, \\frac{\\partial f}{\\partial y}, \\frac{\\partial f}{\\partial z} \\right]$:",
                            "latex": ""
                        },
                        {
                            "desc": "Partial derivative w.r.t $x$:",
                            "latex": f"\\frac{{\\partial f}}{{\\partial x}} = {sp.latex(grad[0])}"
                        },
                        {
                            "desc": "Partial derivative w.r.t $y$:",
                            "latex": f"\\frac{{\\partial f}}{{\\partial y}} = {sp.latex(grad[1])}"
                        },
                        {
                            "desc": "Partial derivative w.r.t $z$:",
                            "latex": f"\\frac{{\\partial f}}{{\\partial z}} = {sp.latex(grad[2])}"
                        },
                        {
                            "desc": "Compile the gradient vector:",
                            "latex": f"\\nabla f = {sp.latex(grad_vector)}"
                        }
                    ]
                })
                return {
                    "success": True,
                    "result_latex": sp.latex(grad_vector),
                    "result_raw": str(grad),
                    "steps": steps
                }
                
            # For divergence/curl, expr_str contains three components separated by commas e.g. "P, Q, R"
            elif type_str in ("divergence", "curl"):
                parts = [p.strip() for p in expr_str.split(",")]
                if len(parts) != 3:
                     raise ValueError("Vector field must contain exactly 3 components separated by commas (P, Q, R).")
                
                P = parse_math(parts[0])
                Q = parse_math(parts[1])
                R = parse_math(parts[2])
                
                if type_str == "divergence":
                    div = sp.diff(P, x) + sp.diff(Q, y) + sp.diff(R, z)
                    steps = []
                    steps.append({
                        "title": "Divergence Resolution Steps",
                        "step_nodes": [
                            {
                                "desc": "The divergence of a vector field $\\mathbf{F} = P\\mathbf{i} + Q\\mathbf{j} + R\\mathbf{k}$ is $\\nabla \\cdot \\mathbf{F} = \\frac{\\partial P}{\\partial x} + \\frac{\\partial Q}{\\partial y} + \\frac{\\partial R}{\\partial z}$:",
                                "latex": ""
                            },
                            {
                                "desc": f"Partial derivatives: $\\frac{{\\partial P}}{{\\partial x}} = {sp.latex(sp.diff(P,x))}$, $\\frac{{\\partial Q}}{{\\partial y}} = {sp.latex(sp.diff(Q,y))}$, $\\frac{{\\partial R}}{{\\partial z}} = {sp.latex(sp.diff(R,z))}$:",
                                "latex": f"{sp.latex(sp.diff(P,x))} + {sp.latex(sp.diff(Q,y))} + {sp.latex(sp.diff(R,z))}"
                            },
                            {
                                "desc": "Sum and simplify:",
                                "latex": f"\\nabla \\cdot \\mathbf{F} = {sp.latex(div)}"
                            }
                        ]
                    })
                    return {
                        "success": True,
                        "result_latex": sp.latex(div),
                        "result_raw": str(div),
                        "steps": steps
                    }
                else: # Curl
                    curl = [
                        sp.diff(R, y) - sp.diff(Q, z),
                        sp.diff(P, z) - sp.diff(R, x),
                        sp.diff(Q, x) - sp.diff(P, y)
                    ]
                    curl_vector = sp.Matrix(curl)
                    steps = []
                    steps.append({
                        "title": "Curl Resolution Steps",
                        "step_nodes": [
                            {
                                "desc": "The curl of vector field $\\mathbf{F} = P\\mathbf{i} + Q\\mathbf{j} + R\\mathbf{k}$ is calculated by the cross product determinant $\\nabla \\times \\mathbf{F} = \\left( \\frac{\\partial R}{\\partial y} - \frac{\\partial Q}{\\partial z} \\right)\\mathbf{i} + \\left( \\frac{\\partial P}{\\partial z} - \frac{\\partial R}{\\partial x} \\right)\\mathbf{j} + \\left( \\frac{\\partial Q}{\\partial x} - \frac{\\partial P}{\\partial y} \\right)\\mathbf{k}$:",
                                "latex": ""
                            },
                            {
                                "desc": "Calculate components independently:",
                                "latex": f"\\nabla \\times \\mathbf{F} = {sp.latex(curl_vector)}"
                            }
                        ]
                    })
                    return {
                        "success": True,
                        "result_latex": sp.latex(curl_vector),
                        "result_raw": str(curl),
                        "steps": steps
                    }
                    
            raise ValueError(f"Unknown vector calculus type: {type_str}")
        except Exception as err:
            traceback.print_exc()
            return {"success": False, "error": str(err)}
