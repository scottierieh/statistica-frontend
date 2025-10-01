
import sys
import json
import pandas as pd
import numpy as np

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj): return None
        return float(obj)
    elif isinstance(obj, np.ndarray): return obj.tolist()
    return obj

def analyze_matrix(responses, question):
    rows = question.get('rows', [])
    columns = question.get('columns', [])
    
    # Initialize results structure
    analysis = {
        "counts": {row: {col: 0 for col in columns} for row in rows},
        "mean_scores": {row: {} for row in rows},
    }
    
    # Create a numeric mapping for the scale if possible
    scale_mapping = {label: i+1 for i, label in enumerate(question.get('scale', columns))}

    # Process responses
    for response in responses:
        answer = response.get('answers', {}).get(str(question['id']))
        if not answer:
            continue
        
        for row_item, col_item in answer.items():
            if row_item in analysis["counts"] and col_item in analysis["counts"][row_item]:
                analysis["counts"][row_item][col_item] += 1
    
    # Calculate mean scores
    for row_item in rows:
        scores = []
        for col_item, count in analysis["counts"][row_item].items():
            score = scale_mapping.get(col_item)
            if score is not None:
                scores.extend([score] * count)
        
        if scores:
            analysis["mean_scores"][row_item] = {
                "mean": np.mean(scores),
                "std": np.std(scores),
                "count": len(scores)
            }
    
    # Restructure for easier consumption
    mean_scores_list = []
    for row, scores in analysis["mean_scores"].items():
        entry = {"name": row}
        for col in columns:
            col_count = analysis["counts"][row][col]
            total_row_count = sum(analysis["counts"][row].values())
            entry[col] = (col_count / total_row_count) * 100 if total_row_count > 0 else 0
        mean_scores_list.append(entry)
    
    analysis['mean_scores'] = mean_scores_list

    return analysis

def main():
    try:
        payload = json.load(sys.stdin)
        responses = payload.get('responses')
        question = payload.get('question')

        if not responses or not question:
            raise ValueError("Missing 'responses' or 'question' data")

        results = analyze_matrix(responses, question)
        
        response = { "results": results }
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
