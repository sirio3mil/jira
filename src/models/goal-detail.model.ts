export interface GoalDetail {
  team: string;
  sprint: string;
  key: string;
  summary: string;
  issueType: string;
  status: string;
  timeSpent?: number;
  assigned?: string;
  storyPoints?: number;
}
