
import sys
import json
import numpy as np
import matplotlib.pyplot as plt
import io
import base64

class AntColonyOptimizer:
    def __init__(self, distances, n_ants, n_iterations, alpha, beta, evaporation_rate, q=1.0):
        self.distances = np.array(distances)
        self.pheromone = np.ones(self.distances.shape) / len(distances)
        self.all_inds = range(len(distances))
        self.n_ants = n_ants
        self.n_iterations = n_iterations
        self.alpha = alpha
        self.beta = beta
        self.evaporation_rate = evaporation_rate
        self.q = q
        self.shortest_path = (None, np.inf)

    def run(self):
        for i in range(self.n_iterations):
            all_paths = self.construct_solutions()
            self.deposit_pheromones(all_paths)
            self.evaporate_pheromones()
            best_path_in_iteration = min(all_paths, key=lambda x: x[1])
            if best_path_in_iteration[1] < self.shortest_path[1]:
                self.shortest_path = best_path_in_iteration
        return self.shortest_path

    def deposit_pheromones(self, all_paths):
        for path, dist in all_paths:
            if dist > 0:
                for i in range(len(self.distances)):
                    self.pheromone[path[i]][path[(i + 1) % len(path)]] += self.q / dist

    def evaporate_pheromones(self):
        self.pheromone *= (1.0 - self.evaporation_rate)

    def construct_solutions(self):
        all_paths = []
        for _ in range(self.n_ants):
            path = []
            visited = set()
            current_node = np.random.randint(0, len(self.distances))
            path.append(current_node)
            visited.add(current_node)

            while len(path) < len(self.distances):
                move = self.select_next_move(current_node, visited)
                path.append(move)
                visited.add(move)
                current_node = move
            
            all_paths.append((path, self.path_distance(path)))
        return all_paths

    def select_next_move(self, current_node, visited):
        pheromone = np.copy(self.pheromone[current_node])
        pheromone[list(visited)] = 0

        with np.errstate(divide='ignore'):
            heuristic = 1.0 / self.distances[current_node]
            heuristic[np.isinf(heuristic)] = 1e10
        
        heuristic[np.isnan(heuristic)] = 1e-10

        probabilities = (pheromone ** self.alpha) * (heuristic ** self.beta)
        
        sum_probs = np.sum(probabilities)
        if sum_probs == 0:
            available_nodes = list(set(self.all_inds) - visited)
            if not available_nodes: return None
            return np.random.choice(available_nodes)

        probabilities /= sum_probs
        next_node = np.random.choice(self.all_inds, 1, p=probabilities)[0]
        return next_node

    def path_distance(self, path):
        dist = 0
        for i in range(len(path)):
            dist += self.distances[path[i]][path[(i + 1) % len(path)]]
        return dist

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def run_ant_colony_analysis(payload):
    cities = payload.get('cities')
    params = payload.get('params', {})

    if not cities or len(cities) < 3:
        raise ValueError("At least 3 cities are required.")

    coords = np.array([[c['lat'], c['lng']] for c in cities])
    city_names = [c['name'] for c in cities]
    
    distances = np.sqrt(((coords[:, np.newaxis, :] - coords[np.newaxis, :, :]) ** 2).sum(axis=2))
    
    aco = AntColonyOptimizer(
        distances=distances,
        n_ants=int(params.get('n_ants', 10)),
        n_iterations=int(params.get('n_iterations', 100)),
        alpha=float(params.get('alpha', 1.0)),
        beta=float(params.get('beta', 2.0)),
        evaporation_rate=float(params.get('evaporation_rate', 0.5))
    )
    
    best_path_indices, best_distance = aco.run()
    best_path_names = [city_names[i] for i in best_path_indices]

    fig, ax = plt.subplots(figsize=(8, 8))
    ax.scatter(coords[:, 1], coords[:, 0], c='red', s=100, label='Cities')
    for i, name in enumerate(city_names):
        ax.text(coords[i, 1], coords[i, 0], f' {name}', fontsize=9)
        
    for i in range(len(best_path_indices)):
        start_node = best_path_indices[i]
        end_node = best_path_indices[(i + 1) % len(best_path_indices)]
        ax.plot([coords[start_node, 1], coords[end_node, 1]], 
                [coords[start_node, 0], coords[end_node, 0]], 'b-')
    
    ax.set_title(f'Optimal Tour (Distance: {best_distance:.2f})')
    ax.set_xlabel('Longitude')
    ax.set_ylabel('Latitude')
    ax.legend()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plot_image = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    
    response = {
        'results': {
            'best_path': best_path_names,
            'total_distance': best_distance,
        },
        'plot': f"data:image/png;base64,{plot_image}"
    }
    
    return json.loads(json.dumps(response, default=_to_native_type))
