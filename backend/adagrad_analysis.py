
import sys
import json
import numpy as np
import math

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating): return float(obj) if np.isfinite(obj) else None
    if isinstance(obj, np.ndarray): return obj.tolist()
    return obj

class AdagradOptimizer:
    def __init__(self, objective_function, bounds, learning_rate=0.01, epsilon=1e-8, max_iter=1000):
        self.objective_function_str = objective_function
        self.bounds = np.array(bounds)
        self.learning_rate = learning_rate
        self.epsilon = epsilon
        self.max_iter = max_iter

        self.n_dims = len(bounds)
        self.current_solution = np.random.uniform(self.bounds[:, 0], self.bounds[:, 1])
        self.best_solution = self.current_solution
        self.best_fitness = self._objective(self.best_solution)

        self.grad_sum_sq = np.zeros(self.n_dims)
        
        self.convergence = []

    def _objective(self, x):
        try:
            return eval(self.objective_function_str, {"np": np, "x": x, "math": math})
        except Exception as e:
            raise ValueError(f"Error evaluating objective function: {e}")

    def _gradient(self, x, h=1e-5):
        grad = np.zeros(self.n_dims)
        for i in range(self.n_dims):
            x_plus = x.copy()
            x_plus[i] += h
            x_minus = x.copy()
            x_minus[i] -= h
            grad[i] = (self._objective(x_plus) - self._objective(x_minus)) / (2 * h)
        return grad

    def run(self):
        for i in range(self.max_iter):
            grad = self._gradient(self.current_solution)

            self.grad_sum_sq += grad ** 2
            
            adjusted_lr = self.learning_rate / (np.sqrt(self.grad_sum_sq) + self.epsilon)
            
            self.current_solution -= adjusted_lr * grad
            self.current_solution = np.clip(self.current_solution, self.bounds[:, 0], self.bounds[:, 1])
            
            self.current_fitness = self._objective(self.current_solution)

            if self.current_fitness < self.best_fitness:
                self.best_solution = self.current_solution
                self.best_fitness = self.current_fitness
                
            self.convergence.append(self.best_fitness)

        return self.best_solution, self.best_fitness, self.convergence

def run_adagrad_analysis(payload):
    optimizer = AdagradOptimizer(
        objective_function=payload['objective_function'],
        bounds=payload['bounds'],
        learning_rate=payload.get('learning_rate', 0.01),
        epsilon=payload.get('epsilon', 1e-8),
        max_iter=payload.get('max_iter', 1000)
    )
    best_solution, best_fitness, convergence = optimizer.run()
    
    return {
        'results': {
            'best_solution': best_solution,
            'best_fitness': best_fitness,
            'convergence': convergence
        }
    }
