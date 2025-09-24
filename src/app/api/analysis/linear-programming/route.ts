
import { NextRequest, NextResponse } from 'next/server';

// Simplex algorithm implementation in TypeScript
function simplex(c: number[], A: number[][], b: number[]) {
    const num_vars = c.length;
    const num_constraints = b.length;

    // Build the initial tableau
    const tableau: number[][] = Array(num_constraints + 1).fill(0).map(() => Array(num_vars + num_constraints + 2).fill(0));
    
    // Objective function row
    for (let j = 0; j < num_vars; j++) {
        tableau[0][j + 1] = -c[j];
    }
    tableau[0][0] = 1;

    // Constraint rows
    for (let i = 0; i < num_constraints; i++) {
        for (let j = 0; j < num_vars; j++) {
            tableau[i + 1][j + 1] = A[i][j];
        }
        tableau[i + 1][num_vars + i + 1] = 1;
        tableau[i + 1][num_vars + num_constraints + 1] = b[i];
    }

    const iterations: { title: string, tableau: number[][], pivot?: {row: number, col: number} }[] = [];
    
    const recordIteration = (title: string, currentTableau: number[][], pivot?: {row: number, col: number}) => {
         iterations.push({
            title: title,
            tableau: JSON.parse(JSON.stringify(currentTableau)), // Deep copy
            pivot,
        });
    };
    
    recordIteration("Initial Tableau", tableau);

    let iter = 0;
    while (true && iter < 100) { 
        iter++;
        
        // Find pivot column (most negative in objective row)
        let pivot_col = -1;
        let max_neg = -1e-6; // Use a small epsilon for float comparison
        for (let j = 1; j < num_vars + num_constraints + 1; j++) {
            if (tableau[0][j] < max_neg) {
                max_neg = tableau[0][j];
                pivot_col = j;
            }
        }

        if (pivot_col === -1) {
            recordIteration("Optimal Tableau", tableau);
            break; // Optimal solution found
        }
        
        // Find pivot row (minimum ratio test)
        let pivot_row = -1;
        let min_ratio = Infinity;
        for (let i = 1; i < num_constraints + 1; i++) {
            if (tableau[i][pivot_col] > 1e-6) { // Use a small epsilon
                const ratio = tableau[i][num_vars + num_constraints + 1] / tableau[i][pivot_col];
                if (ratio < min_ratio) {
                    min_ratio = ratio;
                    pivot_row = i;
                }
            }
        }

        if (pivot_row === -1) {
            throw new Error("Unbounded solution");
        }
        
        recordIteration(`Pivot Selection (Before): Row ${pivot_row}, Column ${pivot_col}`, tableau, {row: pivot_row, col: pivot_col});

        // Perform pivot
        const pivot_element = tableau[pivot_row][pivot_col];
        for (let j = 0; j < num_vars + num_constraints + 2; j++) {
            tableau[pivot_row][j] /= pivot_element;
        }
        for (let i = 0; i < num_constraints + 1; i++) {
            if (i !== pivot_row) {
                const factor = tableau[i][pivot_col];
                for (let j = 0; j < num_vars + num_constraints + 2; j++) {
                    tableau[i][j] -= factor * tableau[pivot_row][j];
                }
            }
        }
        recordIteration(`Pivot Result: Row ${pivot_row}, Column ${pivot_col}`, tableau, {row: pivot_row, col: pivot_col});

    }

    const solution: { [key: string]: number } = {};
    for (let j = 1; j <= num_vars; j++) {
        let val = 0;
        let row_idx = -1;
        let is_basic = true;
        let one_count = 0;
        
        for (let i = 1; i <= num_constraints; i++) {
            if (Math.abs(tableau[i][j] - 1) < 1e-6) {
                one_count++;
                row_idx = i;
            } else if (Math.abs(tableau[i][j]) > 1e-6) {
                is_basic = false;
                break;
            }
        }
        
        if (is_basic && one_count === 1 && Math.abs(tableau[0][j]) < 1e-6) {
            val = tableau[row_idx][num_vars + num_constraints + 1];
        }
        solution[`x${j}`] = val;
    }
    
    return {
        solution: solution,
        optimal_value: tableau[0][num_vars + num_constraints + 1],
        iterations: iterations,
    };
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { c, A, b } = body;
    
    if (!c || !A || !b) {
        return NextResponse.json({ error: "Missing c, A, or b parameters." }, { status: 400 });
    }

    const result = simplex(c, A, b);

    const num_vars = c.length;
    const objective_function_str = `Max Z = ${c.map((coef: number, i: number) => `${coef}x${i+1}`).join(' + ')}`;
    const constraints_str = A.map((row: number[], i: number) => 
        `${row.map((coef: number, j: number) => `${coef}x${j+1}`).join(' + ')} <= ${b[i]}`
    );

    return NextResponse.json({
        results: {
            ...result,
            objective_function_str,
            constraints_str,
        }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
