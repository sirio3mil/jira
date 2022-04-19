import { Command } from 'nest-commander';
import { JiraService } from '../services/jira.service';
import { LogService } from '../services/log.service';
import { TeamService } from '../services/team.service';
import { StoryPointService } from 'src/services/story-point.service';
import { TeamCommand } from './team.command';
import { BugRecord } from 'src/models/bug-record.model';

@Command({ name: 'bug', description: 'Get bugs and defects stats' })
export class BugCommand extends TeamCommand {
  constructor(
    protected readonly logService: LogService,
    protected readonly jiraService: JiraService,
    protected readonly teamService: TeamService,
    protected readonly storyPointService: StoryPointService,
  ) {
    super(logService, teamService);
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
        if (!issue.fields.assignee?.emailAddress) {
          this.logService.log(`No assignee: ${issue.key}`);
          continue;
        }
        const date = issue.fields.updated
          ? new Date(issue.fields.updated)
          : new Date(issue.fields.created);
        let team: any;
        if (issue.fields.customfield_10105) {
          team = this.getTeamBySprint(issue.fields.customfield_10105);
        }
        if (!team) {
          team = this.getTeamByEmail(issue.fields.assignee.emailAddress, date);
          if (!team) {
            this.logService.log(
              'No team found for ' + issue.fields.assignee.emailAddress,
            );
          }
        }
        if (!team) continue;
        const solver = team.members.find(
          (member: { email: string }) =>
            member.email === issue.fields.assignee.emailAddress,
        );
        let sourceIssue: any;
        let assigned: any;
        if (issue.fields.issuelinks?.length) {
          const sourceIssueKey = this.getSourceIssue(issue.fields.issuelinks);
          if (sourceIssueKey) {
            sourceIssue = await this.jiraService.findByKey(sourceIssueKey);
            assigned = team.members.find(
              (member: { email: string }) =>
                member.email === sourceIssue.fields?.assignee?.emailAddress,
            );
          }
        }
        records.push({
          team: team.name,
          projectName: issue.fields.project.name,
          key: issue.key,
          summary: issue.fields.summary,
          issueType: issue.fields.issuetype.name,
          status: issue.fields.status.name,
          timeToFix: issue.fields.aggregatetimespent || null,
          created: issue.fields.created,
          updated: issue.fields.updated,
          solver: issue.fields.assignee.emailAddress,
          solverSalary: solver.salary,
          solverSeniority: solver.seniority,
          causedByKey: sourceIssue?.key,
          causedBySummary: sourceIssue?.fields?.summary,
          timeSpent: sourceIssue?.fields.aggregatetimespent || null,
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
