export const DEFAULT_LEAD_STAGES = [
  { key: "new", name: "New", sortOrder: 0, isWon: false, isLost: false },
  { key: "contacted", name: "Contacted", sortOrder: 1, isWon: false, isLost: false },
  { key: "qualified", name: "Qualified", sortOrder: 2, isWon: false, isLost: false },
  { key: "won", name: "Won", sortOrder: 3, isWon: true, isLost: false },
  { key: "lost", name: "Lost", sortOrder: 4, isWon: false, isLost: true },
] as const;
