import { Injectable } from '@nestjs/common';

@Injectable()
export class IssueService {
  getResolutionDate(issue: any): Date {
    if (issue.fields.resolutiondate) {
      return new Date(issue.fields.resolutiondate);
    }
    return issue.fields.updated
      ? new Date(issue.fields.updated)
      : new Date(issue.fields.created);
  }
}
