
export const ahpData = `{
  "goal": "Select the Best New Smartphone",
  "hasAlternatives": true,
  "alternatives": [
    "Phone X",
    "Phone Y",
    "Phone Z"
  ],
  "hierarchy": [
    {
      "id": "level-0",
      "name": "Criteria",
      "nodes": [
        { "id": "node-0-0", "name": "Price" },
        { "id": "node-0-1", "name": "Performance" },
        { "id": "node-0-2", "name": "Design" }
      ]
    }
  ],
  "matrices": {
    "goal": [
      [1, 0.333, 2],
      [3, 1, 4],
      [0.5, 0.25, 1]
    ],
    "goal.Price": [
      [1, 3, 5],
      [0.333, 1, 2],
      [0.2, 0.5, 1]
    ],
    "goal.Performance": [
      [1, 0.5, 0.333],
      [2, 1, 0.5],
      [3, 2, 1]
    ],
    "goal.Design": [
      [1, 1, 3],
      [1, 1, 3],
      [0.333, 0.333, 1]
    ]
  }
}
`;
