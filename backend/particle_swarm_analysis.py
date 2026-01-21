
import sys
import json
import numpy as np

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating):
        return float(obj) if np.isfinite(obj) else None
    if isinstance(obj, np.ndarray): return obj.tolist()
    return obj

class ParticleSwarmOptimizer:
    def __init__(self, objective_function, n_particles, n_dimensions, bounds, n_iterations, w=0.5, c1=1.5, c2=1.5):
        self.objective_function_str = objective_function
        self.n_particles = n_particles
        self.n_dimensions = n_dimensions
        self.bounds = np.array(bounds)
        self.n_iterations = n_iterations
        self.w = w
        self.c1 = c1
        self.c2 = c2

        self.positions = np.random.rand(self.n_particles, self.n_dimensions) * (self.bounds[:, 1] - self.bounds[:, 0]) + self.bounds[:, 0]
        self.velocities = np.random.randn(self.n_particles, self.n_dimensions) * 0.1
        
        self.personal_best_positions = self.positions.copy()
        self.personal_best_values = np.array([self._objective(p) for p in self.personal_best_positions])
        
        best_idx = np.argmin(self.personal_best_values)
        self.global_best_position = self.personal_best_positions[best_idx]
        self.global_best_value = self.personal_best_values[best_idx]
        
        self.convergence = []

    def _objective(self, x):
        try:
            return eval(self.objective_function_str, {"np": np, "x": x})
        except Exception as e:
            raise ValueError(f"Error evaluating objective function: {e}")

    def run(self):
        for _ in range(self.n_iterations):
            for i in range(self.n_particles):
                # Update velocity
                r1, r2 = np.random.rand(2)
                cognitive_velocity = self.c1 * r1 * (self.personal_best_positions[i] - self.positions[i])
                social_velocity = self.c2 * r2 * (self.global_best_position - self.positions[i])
                self.velocities[i] = self.w * self.velocities[i] + cognitive_velocity + social_velocity

                # Update position
                self.positions[i] += self.velocities[i]

                # Clip positions to stay within bounds
                self.positions[i] = np.clip(self.positions[i], self.bounds[:, 0], self.bounds[:, 1])

                # Update personal best
                current_value = self._objective(self.positions[i])
                if current_value < self.personal_best_values[i]:
                    self.personal_best_values[i] = current_value
                    self.personal_best_positions[i] = self.positions[i]

            # Update global best
            best_idx_iter = np.argmin(self.personal_best_values)
            if self.personal_best_values[best_idx_iter] < self.global_best_value:
                self.global_best_value = self.personal_best_values[best_idx_iter]
                self.global_best_position = self.personal_best_positions[best_idx_iter]

            self.convergence.append(self.global_best_value)
            
        return self.global_best_position, self.global_best_value, self.convergence

def run_particle_swarm_analysis(payload):
    pso = ParticleSwarmOptimizer(
        objective_function=payload['objective_function'],
        n_particles=payload.get('n_particles', 30),
        n_dimensions=payload['n_dimensions'],
        bounds=payload['bounds'],
        n_iterations=payload.get('n_iterations', 100),
        w=payload.get('w', 0.5),
        c1=payload.get('c1', 1.5),
        c2=payload.get('c2', 1.5)
    )
    best_solution, best_fitness, convergence = pso.run()
    
    return {
        'results': {
            'best_solution': best_solution,
            'best_fitness': best_fitness,
            'convergence': convergence
        }
    }
