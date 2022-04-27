import { Injectable } from '@nestjs/common';
import { Sprint } from 'src/models/sprint.model';

@Injectable()
export class IssueService {
  readonly SPRINT = 'Sprint';
  readonly FINISHED = '10125';
  readonly STATUS = 'status';

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

  getSprintIssueType(sprint: Sprint, issue: any): string {
    const histories = issue.changelog?.histories || [];
    // todo - check if the issue is in the sprint
    // todo - check if the issue was added to the sprint
    // todo - check if the issue was removed from the sprint
    for (const history of histories) {
      if (history.items) {
        for (const item of history.items) {
          if (item.field === this.SPRINT) {
            return item.toString;
          }
          if (item.field === this.STATUS && item.to === this.FINISHED) {
            return item.toString;
          }
        }
      }
    }
    return '';
  }
}
