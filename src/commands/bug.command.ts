import { Command } from 'nest-commander';
import { JiraService } from '../services/jira.service';
import { LogService } from '../services/log.service';
import { TeamService } from '../services/team.service';
import { StoryPointService } from '../services/story-point.service';
import { TeamCommand } from './team.command';
import { BugRecord } from '../models/bug-record.model';
import { IssueService } from '../services/issue.service';
import { Member } from 'src/models/member.model';

@Command({ name: 'bug', description: 'Get bugs and defects stats' })
export class BugCommand extends TeamCommand {
  constructor(
    protected readonly logService: LogService,
    protected readonly jiraService: JiraService,
    protected readonly teamService: TeamService,
    protected readonly issueService: IssueService,
    protected readonly storyPointService: StoryPointService,
  ) {
    super(logService, teamService, issueService);
    this.prefix = 'bugs';
  }

  protected getSourceIssue(issueLinks: any[]): string | null {
    for (const issueLink of issueLinks) {
      if (issueLink.type.name === 'Causes') {
        return issueLink.inwardIssue?.key;
      }
      if (issueLink.type.name === 'Relates') {
        return issueLink.inwardIssue?.key;
      }
    }

    return null;
  }

  protected async getIssues(passedParam: string[]) {
    let startAt = 0;
    let total = 0;
    const maxResults = 50;
    const records: BugRecord[] = [];
    const startDate =
      !!passedParam[0] && !isNaN(Date.parse(passedParam[0]))
        ? passedParam[0]
        : 'startOfMonth()';
    const endDate =
      !!passedParam[1] && !isNaN(Date.parse(passedParam[1]))
        ? passedParam[1]
        : 'endOfMonth()';
    do {
      const jql = `jql=created >= ${startDate} AND created <= ${endDate} AND type in (Defecto, Bug) and project not in ("Service Desk Pruebas") ORDER BY priority DESC, updated DESC&startAt=${startAt}&maxResults=${maxResults}&fields=*all`;
      const tasks = await this.jiraService.findAll(jql);
      total = tasks?.total;
      this.logService.log(`Total: ${total}`);
      for (const issue of tasks.issues) {
        const team = this.getIssueTeam(issue);
        if (!team) continue;
        const solver = team.members.find(
          (member) => member.email === issue.fields.assignee.emailAddress,
        );
        let sourceIssue: any;
        let assigned: Member;
        if (issue.fields.issuelinks?.length) {
          const sourceIssueKey = this.getSourceIssue(issue.fields.issuelinks);
          if (sourceIssueKey) {
            sourceIssue = await this.jiraService.findByKey(sourceIssueKey);
            assigned = team.members.find(
              (member) =>
                member.email === sourceIssue.fields?.assignee?.emailAddress,
            );
          }
        }
        const timeToFix = this.issueService.getDevelopmentTime(
          issue,
          this.emails,
        );
        const timeSpent = sourceIssue
          ? this.issueService.getDevelopmentTime(sourceIssue, this.emails)
          : null;
        records.push({
          team: team.name,
          projectName: issue.fields.project.name,
          key: issue.key,
          summary: issue.fields.summary,
          issueType: issue.fields.issuetype.name,
          status: issue.fields.status.name,
          timeToFix,
          created: issue.fields.created,
          updated: issue.fields.updated,
          solver: issue.fields.assignee?.emailAddress,
          solverSalary: solver?.salary,
          solverSeniority: solver?.seniority,
          causedByKey: sourceIssue?.key,
          causedBySummary: sourceIssue?.fields?.summary,
          timeSpent,
          assigned: sourceIssue?.fields.assignee.emailAddress,
          assignedSalary: assigned?.salary,
          assignedSeniority: assigned?.seniority,
        });
      }
      startAt += maxResults;
    } while (total && startAt < total);
    this.logService.log(records.length);
    return records;
  }
}
