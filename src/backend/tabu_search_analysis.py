
import sys
import json
import numpy as np
import math
from collections import deque

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating):
        return float(obj) if np.isfinite(obj) else None
    if isinstance(obj, np.ndarray): return obj.tolist()
    return obj

class TabuSearch:
    def __init__(self, objective_function, bounds, max_iter=1000, tabu_tenure=10, n_neighbors=50):
        self.objective_function_str = objective_function
        self.bounds = np.array(bounds)
        self.max_iter = max_iter
        self.tabu_tenure = tabu_tenure
        self.n_neighbors = n_neighbors
        
        self.current_solution = np.random.uniform(self.bounds[:, 0], self.bounds[:, 1])
        self.best_solution = self.current_solution
        self.best_fitness = self._objective(self.best_solution)
        
        self.tabu_list = deque(maxlen=self.tabu_tenure)
        self.convergence = []

    def _objective(self, x):
        try:
            return eval(self.objective_function_str, {"np": np, "x": x, "math": math})
        except Exception as e:
            raise ValueError(f"Error evaluating objective function: {e}")

    def _get_neighbors(self):
        neighbors = []
        for _ in range(self.n_neighbors):
            neighbor = self.current_solution + np.random.randn(len(self.bounds)) * 0.1
            neighbor = np.clip(neighbor, self.bounds[:, 0], self.bounds[:, 1])
            neighbors.append(neighbor)
        return neighbors

    def run(self):
        for i in range(self.max_iter):
            neighbors = self._get_neighbors()
            
            best_neighbor = None
            best_neighbor_fitness = float('inf')
            
            for neighbor in neighbors:
                neighbor_tuple = tuple(neighbor)
                if neighbor_tuple not in self.tabu_list:
                    fitness = self._objective(neighbor)
                    if fitness < best_neighbor_fitness:
                        best_neighbor = neighbor
                        best_neighbor_fitness = fitness
                        
            if best_neighbor is None:
                # If all neighbors are tabu, pick a random non-tabu neighbor
                # This is a simple strategy to escape being trapped
                while True:
                    neighbor = self.current_solution + np.random.randn(len(self.bounds)) * 0.1
                    neighbor = np.clip(neighbor, self.bounds[:, 0], self.bounds[:, 1])
                    if tuple(neighbor) not in self.tabu_list:
                        best_neighbor = neighbor
                        best_neighbor_fitness = self._objective(best_neighbor)
                        break

            self.current_solution = best_neighbor
            self.current_fitness = best_neighbor_fitness
            
            self.tabu_list.append(tuple(self.current_solution))
            
            if self.current_fitness < self.best_fitness:
                self.best_solution = self.current_solution
                self.best_fitness = self.current_fitness
                
            self.convergence.append(self.best_fitness)

        return self.best_solution, self.best_fitness, self.convergence

def run_tabu_search_analysis(payload):
    ts = TabuSearch(
        objective_function=payload['objective_function'],
        bounds=payload['bounds'],
        max_iter=payload.get('max_iter', 1000),
        tabu_tenure=payload.get('tabu_tenure', 10),
        n_neighbors=payload.get('n_neighbors', 50)
    )
    best_solution, best_fitness, convergence = ts.run()
    
    return {
        'results': {
            'best_solution': best_solution,
            'best_fitness': best_fitness,
            'convergence': convergence
        }
    }
