import { Injectable } from '@nestjs/common';
import { SprintIssue } from 'src/models/sprint-issue.model';
import { Sprint } from 'src/models/sprint.model';

@Injectable()
export class IssueService {
  readonly SPRINT = 'Sprint';
  readonly FINISHED = 10125;
  readonly ERROR = 10004;
  readonly DEFECT = 10100;
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

  getSprintIssue(sprint: Sprint, issue: any): SprintIssue {
    const histories = issue.changelog?.histories || [];
    let planned = false;
    let finished = false;
    let deleted = false;
    for (const history of histories) {
      if (history.items) {
        const created = new Date(history.created);
        for (const item of history.items) {
          if (item.field === this.SPRINT) {
            const to: number = +item.to;
            const from: number = +item.from;
            if (to === sprint.id) {
              planned = created <= sprint.activatedDate;
            }
            if (from === sprint.id) {
              deleted = true;
            }
          }
          if (item.field === this.STATUS && +item.to === this.FINISHED) {
            finished =
              created <= sprint.completeDate && created >= sprint.activatedDate;
          }
        }
      }
    }
    return {
      storyPoints: issue.fields.customfield_10106,
      planned,
      finished,
      deleted,
      type: +issue.fields.issuetype.id,
    };
  }
}
