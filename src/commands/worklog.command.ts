import { Command } from 'nest-commander';
import { LogService } from '../services/log.service';
import { TeamService } from '../services/team.service';
import { TeamCommand } from './team.command';
import { IssueService } from '../services/issue.service';
import { JiraRepository } from '../repositories/JiraRepository';
import { JiraService } from '../services/jira.service';

@Command({
  name: 'worklog',
  description: 'Get bpm project issues worklog',
})
export class WorklogCommand extends TeamCommand {
  checkedIssues: number[] = [];
  data = {};
  tree: any[] = [];
  projects: any[] = [];
  epicIssueType = 10000;
  worklog = {};
  scopeChanges: any[] = [];

  constructor(
    protected readonly logService: LogService,
    protected readonly teamService: TeamService,
    protected readonly issueService: IssueService,
    protected readonly jiraRepository: JiraRepository,
    protected readonly jiraService: JiraService,
  ) {
    super(logService, teamService, issueService);
    this.prefix = 'bpm';
  }

  protected getScopeChangeKey(key: string) {
    const scope = this.scopeChanges.find((data) => data.related.includes(key));
    if (!!scope?.key) {
      return scope.key;
    }

    return null;
  }

  protected async getRelatedIds(keys: any[]) {
    const relatedIds = [];
    for (const key of keys) {
      this.checkedIssues.push(key);
      const parent = this.getParent(key);
      const issue = await this.jiraService.findByKey(
        key,
        'issuelinks,subtasks,issuetype,timetracking,customfield_11102,customfield_11100,customfield_11103,customfield_10105,customfield_10101',
      );
      this.logService.log(`checking ${key} with id ${issue.id}`);
      const issueType = +issue.fields.issuetype.id;
      const action = issue.fields.customfield_11100;
      this.data[key] = {
        id: +issue.id,
        type: issue.fields.issuetype.name,
        time: issue.fields.timetracking.timeSpentSeconds,
        sprints: issue.fields.customfield_10105,
        epicKey: issue.fields.customfield_10101,
        bpm: {
          author: issue.fields.customfield_11102,
          action,
          application: issue.fields.customfield_11103,
        },
      };
      const changes = {
        related: [],
        key,
      };
      let scopeChange = false;
      if (!!action && action.indexOf('alcance') !== -1) {
        this.logService.log(
          `scope change detected ${key} with action ${action}`,
        );
        scopeChange = true;
      }
      if (issue.fields.issuelinks?.length) {
        issue.fields.issuelinks.forEach((link) => {
          if (link.inwardIssue) {
            parent.related.push(link.inwardIssue.key);
            relatedIds.push(link.inwardIssue.key);
            if (scopeChange) {
              changes.related.push(link.inwardIssue.key);
            }
          } else if (link.outwardIssue) {
            parent.related.push(link.outwardIssue.key);
            relatedIds.push(link.outwardIssue.key);
            if (scopeChange) {
              changes.related.push(link.outwardIssue.key);
            }
          }
        });
      }
      if (issue.fields.subtasks?.length) {
        issue.fields.subtasks.forEach((subtask) => {
          parent.related.push(subtask.key);
          relatedIds.push(subtask.key);
          if (scopeChange) {
            changes.related.push(subtask.key);
          }
        });
      }
      if (issueType === this.epicIssueType) {
        const issuesInEpic = await this.jiraService.findByEpic(key, 'key');
        if (issuesInEpic.issues?.length) {
          issuesInEpic.issues.forEach((issue) => {
            this.logService.log(
              `checking epic ${key} found issue ${issue.key}`,
            );
            parent.related.push(issue.key);
            relatedIds.push(issue.key);
            if (scopeChange) {
              changes.related.push(issue.key);
            }
          });
        }
        if (scopeChange) {
          this.scopeChanges.push(changes);
        }
      }
    }
    return relatedIds.filter((key) => !this.checkedIssues.includes(key));
  }

  protected getParent(key: string) {
    return this.tree.find((data) => data.related.includes(key));
  }

  protected async getIssues(passedParam: string[]) {
    let keys = [];
    if (!!passedParam[0]) {
      keys = [passedParam[0]];
    } else {
      const project = 11301;
      const rows = await this.jiraRepository.getProjectIssues(project);
      keys = rows.map((row) => row.pKey);
      rows.forEach((row) => {
        this.projects[row.pKey] = row.summary;
      });
    }
    keys.forEach((key) => {
      this.tree.push({
        related: [key],
      });
    });
    do {
      this.logService.log(`${keys.length} issues found before iteration`);
      keys = await this.getRelatedIds(keys);
      this.logService.log(`${keys.length} issues found after iteration`);
    } while (keys.length);
    const results = [];
    for (const key in this.data) {
      this.logService.log(`${key}`);
      const data = this.data[key];
      this.logService.log(`${data.type}`);
      const parent = this.getParent(key);
      const parentKey = parent.related[0];
      const parentData = this.data[parentKey];
      const epicData = !!data.epicKey ? this.data[data.epicKey] : null;
      const worklogs = await this.jiraRepository.getIssueWorklog(data.id);
      this.logService.log(
        `${parentKey} related issue ${key} with ${worklogs?.length} worklogs`,
      );
      worklogs.forEach((worklog) => {
        const team = this.getTeamByFields(
          data.sprints,
          worklog.email,
          worklog.created,
        );
        let bpmData;
        if (!!epicData && epicData?.bpm?.action) {
          bpmData = epicData.bpm;
          this.logService.log(`${key} have epic data action ${bpmData.action}`);
        }
        if (data?.bpm?.action) {
          bpmData = data.bpm;
          this.logService.log(`${key} have data action ${bpmData.action}`);
        }
        let scopeKey = this.getScopeChangeKey(key);
        if (!bpmData && !!scopeKey) {
          const scopeData = this.data[scopeKey];
          if (scopeData && scopeData?.bpm?.action) {
            bpmData = scopeData.bpm;
            this.logService.log(
              `${key} is related with epic data ${scopeKey} action ${bpmData.action}`,
            );
          }
        }
        if (!bpmData && !!data.epicKey) {
          scopeKey = this.getScopeChangeKey(data.epicKey);
          if (!!scopeKey) {
            const scopeData = this.data[scopeKey];
            if (scopeData && scopeData?.bpm?.action) {
              bpmData = scopeData.bpm;
              this.logService.log(
                `${key} with epic ${data.epicKey} related with epic ${scopeKey} data action ${bpmData.action}`,
              );
            }
          }
        }
        if (!bpmData) {
          bpmData = parentData.bpm;
          this.logService.log(
            `${key} have parent data action ${bpmData.action}`,
          );
        }
        results.push({
          parentKey,
          project: this.projects[parentKey],
          key,
          author: bpmData.author,
          action: bpmData.action,
          application: bpmData.application,
          team: team?.name,
          stack: team?.stack,
          color: team?.color,
          ...worklog,
        });
      });
    }
    return results;
  }
}
