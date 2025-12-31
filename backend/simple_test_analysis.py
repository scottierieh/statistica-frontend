import numpy as np

def run_simple_test_analysis(numbers: list[float]):
    """
    Calculates the sum and average of a list of numbers.
    """
    if not numbers:
        return {"sum": 0, "average": 0}
        
    np_numbers = np.array(numbers)
    
    sum_val = np.sum(np_numbers)
    avg_val = np.mean(np_numbers)
    
    return {
        "sum": float(sum_val),
        "average": float(avg_val)
    }

# This file is intended to be imported as a module, so no __main__ block.
