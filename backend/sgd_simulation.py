
import sys
import json
import numpy as np

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def run_sgd_simulation(learning_rate=0.01, epochs=20, batch_size=1, start_x=4.0, start_y=4.0):
    # 1. Define the function and its gradient
    # We'll use a simple quadratic function f(x,y) = x^2 + y^2
    def f(x, y):
        return x**2 + y**2
    
    # Gradient of f(x,y) is [2x, 2y]
    def grad_f(x, y):
        return np.array([2*x, 2*y])
        
    # Simulate some data points around the minimum (0,0)
    # For this simple function, the gradient doesn't depend on data, but we simulate it for demonstration
    np.random.seed(42)
    data_size = 100
    # In a real scenario, X_data would be your features and the function would be a loss function.
    # Here, we just use it to structure the loops.
    X_data = np.random.rand(data_size, 2) 

    # 2. Initialize
    path = []
    current_pos = np.array([start_x, start_y])
    path.append(current_pos.tolist() + [f(current_pos[0], current_pos[1])])

    # 3. Run SGD
    for epoch in range(epochs):
        indices = np.arange(data_size)
        np.random.shuffle(indices)
        
        for i in range(0, data_size, batch_size):
            batch_indices = indices[i:i+batch_size]
            
            # For this simple function, the gradient is the same regardless of data point.
            # In a real ML problem, you'd calculate gradient based on the mini-batch.
            # We'll just calculate the gradient at the current position.
            gradient = grad_f(current_pos[0], current_pos[1])
            
            # Update position
            current_pos = current_pos - learning_rate * gradient
            path.append(current_pos.tolist() + [f(current_pos[0], current_pos[1])])

    return {
        "path": path,
        "function_expression": "f(x, y) = x² + y²",
        "parameters": {
            "learning_rate": learning_rate,
            "start_x": start_x,
            "start_y": start_y,
            "epochs": epochs,
            "batch_size": batch_size
        }
    }
