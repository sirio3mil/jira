export interface Record {
  key: string;
  issueType: string;
  projectName: string;
  aggregateTimeSpent: number;
  timeEstimate: number;
  created: Date;
  updated: Date;
  emailAddress: string;
  status: string;
  team: string;
  seniority: number;
  salaries: number;
  code: number;
  members: number;
  epicKey: string;
  epicSummary: string;
  causedByKey?: string;
  causedBySummary?: string;
}
