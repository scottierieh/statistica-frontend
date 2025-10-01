

import sys
import json
import pandas as pd
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

def main():
    try:
        payload = json.load(sys.stdin)
        responses = payload.get('responses')
        survey_questions = payload.get('survey_questions')

        if not responses or not survey_questions:
            raise ValueError("Missing 'responses' or 'survey_questions'")

        dimension_scores = {}
        all_gaps = []

        for question in survey_questions:
            if question.get('type') == 'matrix':
                dimension = question.get('title')
                if not dimension: continue
                
                dimension_gaps = []
                for row_item in question.get('rows', []):
                    for response in responses:
                        answer = response.get('answers', {}).get(str(question['id']), {}).get(row_item)
                        if answer and 'Expectation' in answer and 'Perception' in answer:
                             try:
                                expectation = float(answer['Expectation'])
                                perception = float(answer['Perception'])
                                gap = perception - expectation
                                dimension_gaps.append(gap)
                             except (ValueError, TypeError):
                                 continue
                
                if dimension_gaps:
                    avg_gap = np.mean(dimension_gaps)
                    dimension_scores[dimension] = {
                        'name': dimension,
                        'gap': avg_gap,
                        'expectation': np.mean([float(r['answers'][str(question['id'])][row]['Expectation']) for r in responses for row in question.get('rows', []) if r['answers'][str(question['id'])] and r['answers'][str(question['id'])][row] and 'Expectation' in r['answers'][str(question['id'])][row]]),
                        'perception': np.mean([float(r['answers'][str(question['id'])][row]['Perception']) for r in responses for row in question.get('rows', []) if r['answers'][str(question['id'])] and r['answers'][str(question['id'])][row] and 'Perception' in r['answers'][str(question['id'])][row]])
                    }
                    all_gaps.extend(dimension_gaps)

        overall_gap = np.mean(all_gaps) if all_gaps else 0

        response_data = {
            'dimensionScores': list(dimension_scores.values()),
            'overallGap': overall_gap
        }

        print(json.dumps(response_data, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
