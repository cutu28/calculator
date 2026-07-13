from math_engine import MathEngine
import json

print("=== TESTING DERIVATIVES ===")
res_deriv = MathEngine.get_derivative("2*x*sin(x^2)", "x", 1)
print(json.dumps(res_deriv, indent=2))

print("\n=== TESTING INTEGRALS ===")
res_int = MathEngine.get_integral("sin(x)^2", "x")
print(json.dumps(res_int, indent=2))

print("\n=== TESTING LIMITS ===")
res_limit = MathEngine.get_limit("sin(x)/x", "x", "0")
print(json.dumps(res_limit, indent=2))
