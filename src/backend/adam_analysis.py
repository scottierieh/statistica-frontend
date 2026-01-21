import sys
import json
import numpy as np
import math

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating): return float(obj) if np.isfinite(obj) else None
    if isinstance(obj, np.ndarray): return obj.tolist()
    return obj

class AdamOptimizer:
    def __init__(self, objective_function, bounds, learning_rate=0.01, beta1=0.9, beta2=0.999, epsilon=1e-8, max_iter=1000):
        self.objective_function_str = objective_function
        self.bounds = np.array(bounds)
        self.learning_rate = learning_rate
        self.beta1 = beta1
        self.beta2 = beta2
        self.epsilon = epsilon
        self.max_iter = max_iter

        self.n_dims = len(bounds)
        self.current_solution = np.random.uniform(self.bounds[:, 0], self.bounds[:, 1])
        self.best_solution = self.current_solution
        self.best_fitness = self._objective(self.best_solution)

        self.m = np.zeros(self.n_dims)
        self.v = np.zeros(self.n_dims)
        self.t = 0
        
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
            self.t += 1
            grad = self._gradient(self.current_solution)

            self.m = self.beta1 * self.m + (1 - self.beta1) * grad
            self.v = self.beta2 * self.v + (1 - self.beta2) * (grad ** 2)
            
            m_hat = self.m / (1 - self.beta1 ** self.t)
            v_hat = self.v / (1 - self.beta2 ** self.t)
            
            self.current_solution -= self.learning_rate * m_hat / (np.sqrt(v_hat) + self.epsilon)
            self.current_solution = np.clip(self.current_solution, self.bounds[:, 0], self.bounds[:, 1])
            
            self.current_fitness = self._objective(self.current_solution)

            if self.current_fitness < self.best_fitness:
                self.best_solution = self.current_solution
                self.best_fitness = self.current_fitness
                
            self.convergence.append(self.best_fitness)

        return self.best_solution, self.best_fitness, self.convergence

def run_adam_analysis(payload):
    optimizer = AdamOptimizer(
        objective_function=payload['objective_function'],
        bounds=payload['bounds'],
        learning_rate=payload.get('learning_rate', 0.01),
        beta1=payload.get('beta1', 0.9),
        beta2=payload.get('beta2', 0.999),
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
