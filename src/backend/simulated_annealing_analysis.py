
import sys
import json
import numpy as np
import math

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating):
        return float(obj) if np.isfinite(obj) else None
    if isinstance(obj, np.ndarray): return obj.tolist()
    return obj

class SimulatedAnnealing:
    def __init__(self, objective_function, bounds, initial_temp=1000, final_temp=1, cooling_rate=0.99, max_iter=1000):
        self.objective_function_str = objective_function
        self.bounds = np.array(bounds)
        self.initial_temp = initial_temp
        self.final_temp = final_temp
        self.cooling_rate = cooling_rate
        self.max_iter = max_iter
        
        self.current_solution = np.random.uniform(self.bounds[:, 0], self.bounds[:, 1])
        self.current_fitness = self._objective(self.current_solution)
        
        self.best_solution = self.current_solution
        self.best_fitness = self.current_fitness
        
        self.convergence = []

    def _objective(self, x):
        try:
            return eval(self.objective_function_str, {"np": np, "x": x, "math": math})
        except Exception as e:
            raise ValueError(f"Error evaluating objective function: {e}")

    def run(self):
        temp = self.initial_temp
        
        for i in range(self.max_iter):
            if temp < self.final_temp:
                break

            neighbor = self.current_solution + np.random.randn(len(self.bounds)) * 0.1
            neighbor = np.clip(neighbor, self.bounds[:, 0], self.bounds[:, 1])
            
            neighbor_fitness = self._objective(neighbor)
            
            delta = neighbor_fitness - self.current_fitness
            
            if delta < 0 or np.random.rand() < np.exp(-delta / temp):
                self.current_solution = neighbor
                self.current_fitness = neighbor_fitness
                
                if self.current_fitness < self.best_fitness:
                    self.best_solution = self.current_solution
                    self.best_fitness = self.current_fitness
            
            temp *= self.cooling_rate
            self.convergence.append(self.best_fitness)
            
        return self.best_solution, self.best_fitness, self.convergence

def run_simulated_annealing_analysis(payload):
    sa = SimulatedAnnealing(
        objective_function=payload['objective_function'],
        bounds=payload['bounds'],
        initial_temp=payload.get('initial_temp', 1000),
        final_temp=payload.get('final_temp', 1),
        cooling_rate=payload.get('cooling_rate', 0.99),
        max_iter=payload.get('max_iter', 1000)
    )
    best_solution, best_fitness, convergence = sa.run()
    
    return {
        'results': {
            'best_solution': best_solution,
            'best_fitness': best_fitness,
            'convergence': convergence
        }
    }
