export interface Issue {
  id: string;
  key: string;
  issueType: {
    id: string;
    name: string;
  };
  project: {
    id: string;
    key: string;
    name: string;
  };
  aggregateTimeSpent: number;
  storyPoints: number;
  created: Date;
  updated: Date;
  assignee: {
    name: string;
    emailAddress: string;
    displayName: string;
  };
  status: {
    id: string;
    name: string;
  };
  issueLinks: {
    id: string;
    type: {
      id: string;
      name: string;
      inward: string;
      outward: string;
    };
    inwardIssue: {
      id: string;
      key: string;
    };
    outwardIssue: {
      id: string;
      key: string;
    };
  }[];
}
