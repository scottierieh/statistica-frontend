
import sys
import json
import numpy as np
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, (np.floating, float)):
        return float(obj) if np.isfinite(obj) else None
    if isinstance(obj, np.ndarray): return obj.tolist()
    return obj

class GeneticAlgorithm:
    def __init__(self, objective_function, n_vars, var_range, pop_size=50, n_generations=100, mutation_rate=0.01):
        self.objective_function_str = objective_function
        self.n_vars = n_vars
        self.var_range = np.array(var_range)
        self.pop_size = pop_size
        self.n_generations = n_generations
        self.mutation_rate = mutation_rate
        
        self.best_solution = None
        self.best_fitness = -np.inf
        self.convergence = []

    def _objective(self, x):
        try:
            # Safely evaluate the function string
            return eval(self.objective_function_str, {"np": np, "x": x})
        except Exception as e:
            raise ValueError(f"Error evaluating objective function: {e}")

    def run(self):
        # 1. Initialization
        population = np.random.rand(self.pop_size, self.n_vars)
        population = self.var_range[:, 0] + population * (self.var_range[:, 1] - self.var_range[:, 0])

        for gen in range(self.n_generations):
            # 2. Fitness Evaluation
            fitness = np.array([self._objective(ind) for ind in population])
            
            # Update best solution
            best_idx = np.argmax(fitness)
            if fitness[best_idx] > self.best_fitness:
                self.best_fitness = fitness[best_idx]
                self.best_solution = population[best_idx]
            
            self.convergence.append(self.best_fitness)

            # 3. Selection (Tournament Selection)
            selected_indices = []
            for _ in range(self.pop_size):
                tournament_indices = np.random.choice(range(self.pop_size), 2, replace=False)
                if fitness[tournament_indices[0]] > fitness[tournament_indices[1]]:
                    selected_indices.append(tournament_indices[0])
                else:
                    selected_indices.append(tournament_indices[1])
            
            selected_population = population[selected_indices]
            
            # 4. Crossover (Uniform Crossover)
            children = []
            for i in range(0, self.pop_size, 2):
                p1, p2 = selected_population[i], selected_population[i+1]
                child1, child2 = p1.copy(), p2.copy()
                mask = np.random.rand(self.n_vars) > 0.5
                child1[mask] = p2[mask]
                child2[mask] = p1[mask]
                children.extend([child1, child2])
            
            population = np.array(children)

            # 5. Mutation
            for i in range(self.pop_size):
                if np.random.rand() < self.mutation_rate:
                    mutation_var = np.random.randint(0, self.n_vars)
                    population[i, mutation_var] = np.random.uniform(self.var_range[mutation_var, 0], self.var_range[mutation_var, 1])

        return self.best_solution, self.best_fitness, self.convergence

def run_genetic_algorithm_analysis(payload):
    objective_function = payload.get('objective_function')
    n_vars = payload.get('n_vars')
    var_range = payload.get('var_range')
    pop_size = payload.get('pop_size', 50)
    n_generations = payload.get('n_generations', 100)
    mutation_rate = payload.get('mutation_rate', 0.01)

    ga = GeneticAlgorithm(objective_function, n_vars, var_range, pop_size, n_generations, mutation_rate)
    best_solution, best_fitness, convergence = ga.run()

    return {
        'results': {
            'best_solution': best_solution,
            'best_fitness': best_fitness,
            'convergence': convergence
        }
    }

