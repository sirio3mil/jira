export interface SprintIssue {
  storyPoints: number;
  planned: boolean;
  finished: boolean;
  tested: boolean;
  uat: boolean;
  deleted: boolean;
  type: number;
}
