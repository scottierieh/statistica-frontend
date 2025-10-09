import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const AHPResultsVisualization = () => {
  // 예시 데이터 - 실제로는 백엔드에서 받아온 데이터를 사용
  const [results] = useState({
    criteria_analysis: {
      weights: {
        Performance: 0.45,
        Design: 0.35,
        Price: 0.20
      },
      consistency: {
        lambda_max: 3.037,
        CI: 0.0185,
        CR: 0.032,
        is_consistent: true
      }
    },
    alternative_weights_by_criterion: {
      Performance: {
        weights: {
          'iPhone 15': 0.55,
          'Galaxy S24': 0.30,
          'Pixel 8': 0.15
        },
        consistency: {
          CR: 0.021,
          is_consistent: true
        }
      },
      Design: {
        weights: {
          'iPhone 15': 0.45,
          'Galaxy S24': 0.40,
          'Pixel 8': 0.15
        },
        consistency: {
          CR: 0.015,
          is_consistent: true
        }
      },
      Price: {
        weights: {
          'iPhone 15': 0.15,
          'Galaxy S24': 0.30,
          'Pixel 8': 0.55
        },
        consistency: {
          CR: 0.028,
          is_consistent: true
        }
      }
    },
    final_scores: [
      { name: 'iPhone 15', score: 0.435 },
      { name: 'Galaxy S24', score: 0.335 },
      { name: 'Pixel 8', score: 0.230 }
    ],
    ranking: ['iPhone 15', 'Galaxy S24', 'Pixel 8']
  });

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b'];

  // 기준 가중치 데이터 변환
  const criteriaData = Object.entries(results.criteria_analysis.weights).map(([name, weight]) => ({
    name,
    weight: ((weight as number) * 100).toFixed(1),
    weightValue: weight
  })).sort((a, b) => b.weightValue - a.weightValue);

  // 대안별 기준 점수 데이터 변환
  const alternativesBycriterion = results.alternative_weights_by_criterion 
    ? Object.entries(results.alternative_weights_by_criterion).map(([criterion, data]: [string, any]) => ({
        criterion,
        alternatives: Object.entries(data.weights).map(([name, weight]) => ({
          name,
          weight: ((weight as number) * 100).toFixed(1),
          weightValue: weight
        })),
        cr: data.consistency.CR,
        isConsistent: data.consistency.is_consistent
      }))
    : [];

  // 최종 점수 데이터 (이미 정렬됨)
  const finalScoresData = results.final_scores?.map(item => ({
    name: item.name,
    score: ((item.score as number) * 100).toFixed(1),
    scoreValue: item.score
  })) || [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border-2 border-purple-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{payload[0].payload.name}</p>
          <p className="text-purple-600 font-bold">{payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        AHP Analysis Results
      </h1>

      {/* Criteria Analysis Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Criteria Weights</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              CR: <span className={`font-bold ${results.criteria_analysis.consistency.CR < 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                {(results.criteria_analysis.consistency.CR * 100).toFixed(2)}%
              </span>
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              results.criteria_analysis.consistency.is_consistent 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {results.criteria_analysis.consistency.is_consistent ? '✓ Consistent' : '✗ Inconsistent'}
            </span>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4">
          The criteria weights represent the relative importance of each evaluation criterion in the decision-making process. 
          Higher weights indicate more influential criteria in the final decision.
        </p>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={criteriaData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fill: '#4b5563', fontWeight: 600 }} />
            <YAxis label={{ value: 'Weight (%)', angle: -90, position: 'insideLeft', fill: '#4b5563' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="weight" radius={[8, 8, 0, 0]}>
              {criteriaData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Criteria Weights Table */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Detailed Criteria Weights</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-purple-100">
                  <th className="border border-purple-200 px-4 py-2 text-left font-semibold text-gray-700">Rank</th>
                  <th className="border border-purple-200 px-4 py-2 text-left font-semibold text-gray-700">Criterion</th>
                  <th className="border border-purple-200 px-4 py-2 text-right font-semibold text-gray-700">Weight</th>
                  <th className="border border-purple-200 px-4 py-2 text-right font-semibold text-gray-700">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {criteriaData.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-200 px-4 py-2 text-center font-semibold text-purple-600">
                      {index + 1}
                    </td>
                    <td className="border border-gray-200 px-4 py-2 font-medium">{item.name}</td>
                    <td className="border border-gray-200 px-4 py-2 text-right font-mono">
                      {item.weightValue.toFixed(4)}
                    </td>
                    <td className="border border-gray-200 px-4 py-2 text-right">
                      <span className="font-semibold text-purple-600">{item.weight}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Alternative Analysis by Criterion */}
      {alternativesBycriterion.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Alternative Weights by Criterion</h2>
          <p className="text-gray-600 text-sm mb-6">
            These charts show how each alternative performs under each specific criterion. 
            The weights represent the relative preference for each alternative when evaluated solely on that criterion.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alternativesBycriterion.map((item, idx) => (
              <div key={idx} className="border-2 border-purple-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800">{item.criterion}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.isConsistent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    CR: {(item.cr * 100).toFixed(1)}%
                  </span>
                </div>
                
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={item.alternatives} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="weight" fill={COLORS[idx % COLORS.length]} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Mini Table for each criterion */}
                <div className="mt-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1 font-semibold text-gray-600">Alternative</th>
                        <th className="text-right py-1 font-semibold text-gray-600">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.alternatives.map((alt, altIdx) => (
                        <tr key={altIdx} className="border-b border-gray-100">
                          <td className="py-1 text-gray-700">{alt.name}</td>
                          <td className="py-1 text-right font-semibold text-purple-600">{alt.weight}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Ranking */}
      {finalScoresData.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Final Ranking</h2>
          <p className="text-gray-600 text-sm mb-4">
            The final scores are calculated by combining the criteria weights with each alternative's performance across all criteria. 
            This represents the overall preference ranking based on the complete AHP analysis.
          </p>
          
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={finalScoresData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" label={{ value: 'Final Score (%)', position: 'insideBottom', offset: -5, fill: '#4b5563' }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#4b5563', fontWeight: 600 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                {finalScoresData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === 0 ? '#fbbf24' : COLORS[index % COLORS.length]}
                    stroke={index === 0 ? '#f59e0b' : 'none'}
                    strokeWidth={index === 0 ? 3 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Final Ranking Table */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Detailed Final Scores</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-yellow-100">
                    <th className="border border-yellow-200 px-4 py-2 text-left font-semibold text-gray-700">Rank</th>
                    <th className="border border-yellow-200 px-4 py-2 text-left font-semibold text-gray-700">Alternative</th>
                    <th className="border border-yellow-200 px-4 py-2 text-right font-semibold text-gray-700">Final Score</th>
                    <th className="border border-yellow-200 px-4 py-2 text-right font-semibold text-gray-700">Percentage</th>
                    <th className="border border-yellow-200 px-4 py-2 text-center font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {finalScoresData.map((item, index) => (
                    <tr 
                      key={index} 
                      className={`${
                        index === 0 
                          ? 'bg-yellow-50 font-bold' 
                          : index % 2 === 0 
                            ? 'bg-white' 
                            : 'bg-gray-50'
                      }`}
                    >
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                          index === 0 
                            ? 'bg-yellow-400 text-white' 
                            : 'bg-gray-200 text-gray-700'
                        } font-bold`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-2 font-medium">
                        {index === 0 && '🏆 '}{item.name}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-right font-mono">
                        {item.scoreValue.toFixed(4)}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-right">
                        <span className={`font-semibold ${
                          index === 0 ? 'text-yellow-600' : 'text-purple-600'
                        }`}>
                          {item.score}%
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        {index === 0 && (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
                            Best Choice
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Winner Badge */}
          <div className="mt-6 flex items-center justify-center">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-8 py-4 rounded-full shadow-lg">
              <span className="text-lg font-bold">🏆 Best Choice: </span>
              <span className="text-2xl font-extrabold">{results.ranking[0]}</span>
            </div>
          </div>
        </div>
      )}

      {/* AHP Results Explanation Section */}
      <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-blue-900 mb-4">📊 Understanding AHP Results</h3>
        
        <div className="space-y-4 text-sm text-gray-700">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="font-semibold text-blue-800 mb-2 text-base">What is Consistency Ratio (CR)?</p>
            <p>
              The Consistency Ratio measures how consistent your pairwise comparisons are. 
              A CR less than 10% (0.1) indicates acceptable consistency. Higher values suggest you should review your comparisons.
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <p className="font-semibold text-blue-800 mb-2 text-base">How to interpret the results?</p>
            <div className="space-y-1">
              <p><strong className="text-purple-700">Criteria Weights:</strong> Show the relative importance of each evaluation criterion.</p>
              <p><strong className="text-purple-700">Alternative Weights:</strong> Show how each option performs under each specific criterion.</p>
              <p><strong className="text-purple-700">Final Scores:</strong> Combine both to give an overall ranking of alternatives.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                <span className="text-lg">✓</span> Current Consistency Status
              </p>
              <p className="mb-1">
                <span className="font-semibold">Criteria CR:</span>{' '}
                <span className={`font-bold text-lg ${results.criteria_analysis.consistency.is_consistent ? 'text-green-600' : 'text-red-600'}`}>
                  {(results.criteria_analysis.consistency.CR * 100).toFixed(2)}%
                </span>
              </p>
              <p className="text-xs text-gray-600">
                {results.criteria_analysis.consistency.is_consistent 
                  ? '✓ Your comparisons are consistent and reliable' 
                  : '✗ Please review your pairwise comparisons'}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="font-semibold text-purple-700 mb-2 flex items-center gap-2">
                <span className="text-lg">📈</span> Key Metrics
              </p>
              <div className="space-y-1">
                <p>
                  <span className="font-semibold">λmax (Lambda Max):</span>{' '}
                  <span className="font-mono text-gray-700">{results.criteria_analysis.consistency.lambda_max.toFixed(4)}</span>
                </p>
                <p>
                  <span className="font-semibold">CI (Consistency Index):</span>{' '}
                  <span className="font-mono text-gray-700">{results.criteria_analysis.consistency.CI.toFixed(4)}</span>
                </p>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Lower values indicate better consistency
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AHPResultsVisualization;
