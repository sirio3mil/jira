import { Command } from 'nest-commander';
import { LogService } from '../services/log.service';
import { TeamService } from '../services/team.service';
import { TeamCommand } from './team.command';
import { IssueService } from '../services/issue.service';
import { JiraRepository } from '../repositories/JiraRepository';
import { JiraService } from '../services/jira.service';

@Command({
  name: 'cost',
  description: 'Get bpm project development costs',
})
export class CostCommand extends TeamCommand {
  checkedIssues: number[] = [];
  data = {};
  tree: any[] = [];
  epicIssueType = 10000;
  worklog = {};

  constructor(
    protected readonly logService: LogService,
    protected readonly teamService: TeamService,
    protected readonly issueService: IssueService,
    protected readonly jiraRepository: JiraRepository,
    protected readonly jiraService: JiraService,
  ) {
    super(logService, teamService, issueService);
    this.prefix = 'costs';
  }

  protected async getRelatedIds(keys: any[]) {
    const relatedIds = [];
    for (const key of keys) {
      this.checkedIssues.push(key);
      const parent = this.getParent(key);
      const issue = await this.jiraService.findByKey(
        key,
        'issuelinks,subtasks,issuetype,timetracking,customfield_11102,summary',
      );
      this.logService.log(`checking ${key} with id ${issue.id}`);
      const issueType = +issue.fields.issuetype.id;
      this.data[key] = {
        id: +issue.id,
        type: issue.fields.issuetype.name,
        time: issue.fields.timetracking.timeSpentSeconds,
        bpm: {
          author: issue.fields.customfield_11102,
        },
        summary: issue.fields.summary,
      };
      if (issue.fields.issuelinks?.length) {
        issue.fields.issuelinks.forEach((link) => {
          if (link.inwardIssue) {
            parent.related.push(link.inwardIssue.key);
            relatedIds.push(link.inwardIssue.key);
          } else if (link.outwardIssue) {
            parent.related.push(link.outwardIssue.key);
            relatedIds.push(link.outwardIssue.key);
          }
        });
      }
      if (issue.fields.subtasks?.length) {
        issue.fields.subtasks.forEach((subtask) => {
          parent.related.push(subtask.key);
          relatedIds.push(subtask.key);
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
          });
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
    const salaries = this.teamService.getSalaries();
    for (const key in this.data) {
      this.logService.log(`${key}`);
      const data = this.data[key];
      this.logService.log(`${data.type}`);
      const parent = this.getParent(key);
      const parentKey = parent.related[0];
      const worklogs = await this.jiraRepository.getIssueWorklog(data.id);
      this.logService.log(
        `${parentKey} related issue ${key} with ${worklogs?.length} worklogs`,
      );
      worklogs.forEach((worklog) => {
        const hourCost = salaries[worklog.email]?.hourCost
          ? salaries[worklog.email].hourCost
          : 0;
        const cost = hourCost * (worklog.timeworked / 3600);
        results.push({
          parentKey,
          summary: this.data[parentKey].summary,
          key,
          author: this.data[parentKey].bpm.author,
          ...worklog,
          hourCost,
          cost: cost.toFixed(2),
        });
      });
    }
    return results;
  }
}
