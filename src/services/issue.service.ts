import { Injectable } from '@nestjs/common';
import { SprintIssue } from 'src/models/sprint-issue.model';
import { Sprint } from 'src/models/sprint.model';
import { LogService } from './log.service';

@Injectable()
export class IssueService {
  readonly SPRINT = 'Sprint';
  readonly FINISHED = 10125;
  readonly TESTED = 10218;
  readonly READY_TEST = 10302;
  readonly DEV = 10401;
  readonly READY_DEV = 10213;
  readonly PRE = 10216;
  readonly READY_PRE = 10214;
  readonly UAT = 11000;
  readonly ERROR = 10004;
  readonly DEFECT = 10100;
  readonly STATUS = 'status';
  constructor(protected readonly logService: LogService) {}

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
    let tested = false;
    let uat = false;
    let deleted = false;
    for (const history of histories) {
      if (history.items) {
        const created = new Date(history.created);
        for (const item of history.items) {
          if (item.field === this.SPRINT) {
            const to: number[] = item.to?.split(',').map(Number) || [];
            const from: number[] = item.from?.split(',').map(Number) || [];
            if (to.includes(sprint.id)) {
              this.logService.log(`To sprint: ${issue.key}`);
              if (!planned) {
                planned = created <= sprint.activatedDate;
                this.logService.log(
                  `Planned ${planned}: ${issue.key} ${issue.fields.customfield_10106}`,
                );
              }
            } else if (from.includes(sprint.id)) {
              if (created <= sprint.activatedDate) {
                planned = false;
              } else {
                deleted = true;
              }
            }
          }
          if (item.field === this.STATUS) {
            const to = +item.to;
            if (to === this.FINISHED) {
              finished =
                created <= sprint.completeDate &&
                created >= sprint.activatedDate;
              this.logService.log(
                `Finished ${finished}: ${issue.key} ${issue.fields.customfield_10106}`,
              );
            } else if (
              !tested &&
              (to === this.TESTED || to === this.READY_TEST)
            ) {
              tested =
                created <= sprint.completeDate &&
                created >= sprint.activatedDate;
              this.logService.log(
                `Tested ${tested}: ${issue.key} ${issue.fields.customfield_10106}`,
              );
            } else if (
              !uat &&
              (to === this.UAT ||
                to === this.DEV ||
                to === this.READY_DEV ||
                to === this.PRE ||
                to === this.READY_PRE)
            ) {
              uat =
                created <= sprint.completeDate &&
                created >= sprint.activatedDate;
              this.logService.log(
                `UAT ${uat}: ${issue.key} ${issue.fields.customfield_10106}`,
              );
            }
          }
        }
      }
    }
    if (finished) {
      tested = false;
      uat = false;
    } else if (uat) {
      tested = false;
    }
    return {
      storyPoints: issue.fields.customfield_10106,
      planned,
      finished,
      tested,
      uat,
      deleted,
      type: +issue.fields.issuetype.id,
    };
  }
}
