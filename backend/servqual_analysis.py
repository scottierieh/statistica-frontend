
import sys
import json
import pandas as pd
import numpy as np

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

def main():
    try:
        payload = json.load(sys.stdin)
        responses = payload.get('responses')
        survey_questions = payload.get('survey_questions')

        if not responses or not survey_questions:
            raise ValueError("Missing 'responses' or 'survey_questions'")

        dimension_scores = {}
        all_gaps = []
        all_perceptions = []

        is_servperf = False

        for question in survey_questions:
            q_type = question.get('type')
            if q_type == 'matrix' or q_type == 'servqual':
                dimension = question.get('title')
                if not dimension: continue
                
                dimension_gaps = []
                dimension_perceptions = []
                dimension_expectations = []

                # Determine if it's SERVPERF by checking a sample answer
                first_response_answer = responses[0].get('answers', {}).get(str(question['id']), {}).get(question.get('rows', [])[0], {})
                is_servperf = 'Perception' in first_response_answer and 'Expectation' not in first_response_answer

                for row_item in question.get('rows', []):
                    for response in responses:
                        answer = response.get('answers', {}).get(str(question['id']), {}).get(row_item)
                        if answer:
                            try:
                                perception = float(answer['Perception']) if 'Perception' in answer else np.nan
                                if not is_servperf:
                                    expectation = float(answer['Expectation']) if 'Expectation' in answer else np.nan
                                    if not np.isnan(perception) and not np.isnan(expectation):
                                        dimension_gaps.append(perception - expectation)
                                        dimension_expectations.append(expectation)
                                if not np.isnan(perception):
                                    dimension_perceptions.append(perception)
                            except (ValueError, TypeError):
                                continue
                
                if is_servperf:
                    if dimension_perceptions:
                        avg_perception = np.mean(dimension_perceptions)
                        dimension_scores[dimension] = {
                            'name': dimension,
                            'perception': avg_perception,
                            'gap': avg_perception # For SERVPERF, the "gap" is just the perception score
                        }
                        all_perceptions.extend(dimension_perceptions)
                else:
                    if dimension_gaps:
                        avg_gap = np.mean(dimension_gaps)
                        dimension_scores[dimension] = {
                            'name': dimension,
                            'gap': avg_gap,
                            'expectation': np.mean(dimension_expectations) if dimension_expectations else 0,
                            'perception': np.mean(dimension_perceptions) if dimension_perceptions else 0
                        }
                        all_gaps.extend(dimension_gaps)

        if is_servperf:
            overall_score = np.mean(all_perceptions) if all_perceptions else 0
        else:
            overall_score = np.mean(all_gaps) if all_gaps else 0

        response_data = {
            'dimensionScores': list(dimension_scores.values()),
            'overallGap': overall_score,
            'analysisType': 'SERVPERF' if is_servperf else 'SERVQUAL'
        }

        print(json.dumps(response_data, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
