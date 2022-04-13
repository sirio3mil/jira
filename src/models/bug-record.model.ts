export interface BugRecord {
  team: string;
  projectName: string;
  key: string;
  summary: string;
  issueType: string;
  status: string;
  timeToFix?: number;
  created: Date;
  updated: Date;
  solver: string;
  solverSalary: number;
  solverSeniority: number;
  causedByKey?: string;
  causedBySummary?: string;
  timeSpent?: number;
  assigned?: string;
  assignedSalary?: number;
  assignedSeniority?: number;
}
