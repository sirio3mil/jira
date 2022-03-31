import { Command, CommandRunner } from 'nest-commander';
import { Issue } from './issue.model';
import { JiraService } from './jira.service';
import { LogService } from './log.service';

@Command({ name: 'jira', description: 'A parameter parse' })
export class JiraCommand implements CommandRunner {
  constructor(
    private readonly logService: LogService,
    private readonly jiraService: JiraService,
  ) {}

  async run(): Promise<void> {
    let startAt = 0;
    const maxResults = 50;
    let tasks = await this.jiraService.findAll(startAt, maxResults);
    const total = tasks?.total;
    this.logService.log(total);
    const issues: Issue[] = [];
    while (total && startAt + maxResults < total) {
      startAt += maxResults;
      tasks = await this.jiraService.findAll(startAt, maxResults);
      this.logService.log(tasks.startAt);
      tasks.issues.forEach((issue) => {
        issues.push({
          id: issue.id,
          key: issue.key,
          issueType: {
            id: issue.fields.issuetype.id,
            name: issue.fields.issuetype.name,
          },
          project: {
            id: issue.fields.project.id,
            key: issue.fields.project.key,
            name: issue.fields.project.name,
          },
          aggregateTimeSpent: issue.fields.aggregatetimespent,
          storyPoints: issue.fields.customfield_10106,
          created: issue.fields.created,
          updated: issue.fields.updated,
          assignee: {
            name: issue.fields.assignee?.name,
            emailAddress: issue.fields.assignee?.emailAddress,
            displayName: issue.fields.assignee?.displayName,
          },
          status: {
            id: issue.fields.status.id,
            name: issue.fields.status.name,
          },
          issueLinks: issue.fields.issuelinks.map((link) => ({
            id: link.id,
            type: {
              id: link.type.id,
              name: link.type.name,
              inward: link.type.inward,
              outward: link.type.outward,
            },
            inwardIssue: {
              id: link.inwardIssue?.id,
              key: link.inwardIssue?.key,
            },
            outwardIssue: {
              id: link.outwardIssue?.id,
              key: link.outwardIssue?.key,
            },
          })),
        });
      });
    }
  }
}
