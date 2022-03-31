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
}
