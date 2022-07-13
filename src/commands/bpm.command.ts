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
    this.prefix = 'multi-user-subtasks';
  }

  protected async getRelatedIds(keys: any[]) {
    const relatedIds = [];
    for (const key of keys) {
      this.checkedIssues.push(key);
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
            relatedIds.push(link.inwardIssue.key);
          } else if (link.outwardIssue) {
            relatedIds.push(link.outwardIssue.key);
          }
        });
      }
      if (issue.fields.subtasks?.length) {
        issue.fields.subtasks.forEach((subtask) => {
          relatedIds.push(subtask.key);
        });
      }
    }
    return relatedIds.filter((key) => !this.checkedIssues.includes(key));
  }

  protected getParent(key: string) {
    this.tree.find((data) => data.related.includes(key));
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
    return {};
  }
}
