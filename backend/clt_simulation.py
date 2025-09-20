
import sys
import json
import numpy as np
from scipy import stats

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

def generate_population(distribution, size=10000):
    """Generate population data."""
    np.random.seed(42)
    
    if distribution == "Uniform":
        return np.random.uniform(0, 10, size)
    elif distribution == "Normal":
        return np.random.normal(5, 2, size)
    elif distribution == "Exponential":
        return np.random.exponential(2, size)
    elif distribution == "Skewed (Gamma)":
        return np.random.gamma(2, 2, size)
    elif distribution == "Bimodal":
        mode1 = np.random.normal(3, 1, size // 2)
        mode2 = np.random.normal(7, 1, size // 2)
        return np.concatenate([mode1, mode2])
    return np.array([])

def run_simulation(population, sample_size, num_samples):
    """Run the simulation to get sample means."""
    if len(population) < sample_size:
        raise ValueError("Population size must be greater than or equal to sample size.")
    sample_means = [np.mean(np.random.choice(population, sample_size, replace=False)) for _ in range(num_samples)]
    return np.array(sample_means)

def main():
    try:
        payload = json.load(sys.stdin)
        distribution = payload.get('distribution', 'Normal')
        sample_size = int(payload.get('sample_size', 30))
        num_samples = int(payload.get('num_samples', 1000))
        
        # 1. Generate Population
        population = generate_population(distribution)
        
        # 2. Run Simulation
        sample_means = run_simulation(population, sample_size, num_samples)
        
        # 3. Calculate Statistics
        pop_mean = np.mean(population)
        pop_std = np.std(population)
        sample_mean_of_means = np.mean(sample_means)
        sample_std_of_means = np.std(sample_means)
        theoretical_std = pop_std / np.sqrt(sample_size) if sample_size > 0 else np.inf
        
        # 4. Normality Test (Shapiro-Wilk)
        shapiro_stat, shapiro_p = stats.shapiro(sample_means) if len(sample_means) >= 3 else (np.nan, np.nan)
        
        # 5. Q-Q Plot Data
        osm, osr = stats.probplot(sample_means, dist="norm", fit=False)
        qq_plot_data = {'osm': osm.tolist(), 'osr': osr.tolist()}

        response = {
            "population_distribution": population.tolist(),
            "sample_means_distribution": sample_means.tolist(),
            "stats": {
                "population_mean": pop_mean,
                "population_std": pop_std,
                "sample_mean_of_means": sample_mean_of_means,
                "actual_se": sample_std_of_means,
                "theoretical_se": theoretical_std
            },
            "normality_test": {
                "statistic": shapiro_stat,
                "p_value": shapiro_p
            },
            "qq_plot_data": qq_plot_data
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
