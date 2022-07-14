import { Command } from 'nest-commander';
import { LogService } from '../services/log.service';
import { TeamService } from '../services/team.service';
import { TeamCommand } from './team.command';
import { IssueService } from 'src/services/issue.service';
import { JiraRepository } from 'src/repositories/JiraRepository';
import { JiraService } from 'src/services/jira.service';

@Command({
  name: 'bpm',
  description: 'Get bpm project issues',
})
export class BPMCommand extends TeamCommand {
  checkedIssues: number[] = [];
  data = {};
  tree: any[] = [];

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

  protected async getRelatedIds(keys: any[]) {
    const relatedIds = [];
    for (const key of keys) {
      this.checkedIssues.push(key);
      const parent = this.getParent(key);
      const issue = await this.jiraService.findByKey(
        key,
        'issuelinks,subtasks,issuetype,timetracking',
      );
      this.data[key] = {
        type: issue.fields.issuetype.name,
        time: issue.fields.timetracking.timeSpentSeconds,
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
    }
    return relatedIds.filter((key) => !this.checkedIssues.includes(key));
  }

  protected getParent(key: string) {
    return this.tree.find((data) => data.related.includes(key));
  }

  protected async getIssues() {
    const project = 11301;
    const rows = await this.jiraRepository.getProjectIssues(project);
    let keys = rows.map((row) => row.pKey);
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
    const results = {};
    for (const key in this.data) {
      this.logService.log(`${key}`);
      const data = this.data[key];
      this.logService.log(`${data.type}`);
      const parent = this.getParent(key);
      const parentKey = parent.related[0];
      this.logService.log(`${parentKey} related issue`);
      const time = data.time ? +data.time : 0;
      if (!results.hasOwnProperty(parentKey)) {
        results[parentKey] = {
          Epic: 0,
          Historia: 0,
          Subtarea: 0,
          Tarea: 0,
          Defecto: 0,
          Error: 0,
        };
      }
      if (!results[parentKey].hasOwnProperty(data.type)) {
        throw new Error(`Unknown type ${data.type}`);
      }
      results[parentKey][data.type] += time;
    }
    return Object.keys(results).map(function (key) {
      return { key, ...results[key] };
    });
  }
}
