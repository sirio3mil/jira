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

  getResolutionTime(issue: any): number {
    const resolutionDate = this.getResolutionDate(issue);
    const created = new Date(issue.fields.created);
    return (
      (resolutionDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  getDevelopmentTime(issue: any, developersEmails: string[]): number {
    let aggregateTimeSpent = issue.fields.aggregatetimespent;
    if (!aggregateTimeSpent) {
      return 0;
    }
    const worklogs = issue.fields.worklog?.worklogs || [];
    if (worklogs.length) {
      for (const worklog of worklogs) {
        if (worklog.timeSpentSeconds) {
          const authorEmail = worklog.author?.emailAddress;
          if (authorEmail && !developersEmails.includes(authorEmail)) {
            aggregateTimeSpent -= worklog.timeSpentSeconds;
          }
        }
      }
    }
    return aggregateTimeSpent;
  }
}
