export interface GoalDetail {
  team: string;
  stack: string;
  week: number;
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
