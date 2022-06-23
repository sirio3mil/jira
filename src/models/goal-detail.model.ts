export interface GoalDetail {
  code: number;
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
  estimated?: number;
  sprintTimeSpent?: number;
  dueDate: Date;
}
