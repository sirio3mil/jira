export interface GoalDetail {
  team: string;
  stack: string;
  sprint: string;
  key: string;
  summary: string;
  issueType: string;
  status: string;
  timeSpent?: number;
  assigned?: string;
  storyPoints?: number;
  dueDate: Date;
}
