import { Command } from 'nest-commander';
import { JiraService } from '../services/jira.service';
import { LogService } from '../services/log.service';
import { IssueService } from 'src/services/issue.service';
import { Record } from '../models/record.model';
import { TeamService } from '../services/team.service';
import { StoryPointService } from 'src/services/story-point.service';
import { TeamCommand } from './team.command';

@Command({ name: 'ratio', description: 'Get story points ratio stats' })
export class RatioCommand extends TeamCommand {
  constructor(
    protected readonly logService: LogService,
    protected readonly jiraService: JiraService,
    protected readonly teamService: TeamService,
    protected readonly issueService: IssueService,
    protected readonly storyPointService: StoryPointService,
  ) {
    super(logService, teamService, issueService);
  }

  protected async getIssues(passedParam: string[]) {
    let startAt = 0;
    let total = 0;
    const maxResults = 50;
    const records: Record[] = [];
    const epics = {};
    const startDate =
      !!passedParam[0] && !isNaN(Date.parse(passedParam[0]))
        ? passedParam[0]
        : 'startOfMonth()';
    const endDate =
      !!passedParam[1] && !isNaN(Date.parse(passedParam[1]))
        ? passedParam[1]
        : 'endOfMonth()';
    do {
      const jql = `jql=status changed TO Terminado DURING (${startDate},${endDate}) AND type in (standardIssueTypes()) and project not in ("Service Desk Pruebas") ORDER BY priority DESC, updated DESC&startAt=${startAt}&maxResults=${maxResults}&fields=*all`;
      this.logService.log(jql);
      const tasks = await this.jiraService.findAll(jql);
      total = tasks?.total;
      this.logService.log(total);
      this.logService.log(tasks.startAt);
      for (const issue of tasks.issues) {
        let epic = {} as any;
        const team = this.getIssueTeam(issue);
        if (!team) continue;
        if (!issue.fields.customfield_10106) continue;
        if (!issue.fields.aggregatetimespent) continue;
        const developmentTime = this.issueService.getDevelopmentTime(
          issue,
          this.emails,
        );
        if (developmentTime <= 0) continue;
        const timeEstimate = this.storyPointService.toSeconds(
          issue.fields.customfield_10106,
          developmentTime,
        );
        if (!timeEstimate) continue;
        if (!!issue.fields.customfield_10101) {
          epic = epics[issue.fields.customfield_10101];
          if (!epic) {
            epic = await this.jiraService.findByKey(
              issue.fields.customfield_10101,
            );
            epics[issue.fields.customfield_10101] = epic;
          }
        }
        let sourceIssue: any;
        if (issue.fields.issuelinks?.length) {
          const sourceIssueKey = this.getSourceIssue(issue.fields.issuelinks);
          if (sourceIssueKey) {
            sourceIssue = await this.jiraService.findByKey(sourceIssueKey);
            this.logService.log(sourceIssue.fields?.summary);
          }
        }
        records.push({
          team: team.name,
          seniority: team.seniority,
          salaries: team.salaries,
          code: team.code,
          members: team.members.length,
          key: issue.key,
          summary: issue.fields.summary,
          issueType: issue.fields.issuetype.name,
          projectName: issue.fields.project.name,
          aggregateTimeSpent: developmentTime,
          timeEstimate,
          created: issue.fields.created,
          updated: issue.fields.updated,
          emailAddress: issue.fields.assignee?.emailAddress,
          status: issue.fields.status.name,
          epicKey: issue.fields.customfield_10101,
          epicSummary: epic?.fields?.summary,
          causedByKey: sourceIssue?.key,
          causedBySummary: sourceIssue?.fields?.summary,
          color: team.color,
        });
      }
      startAt += maxResults;
    } while (total && startAt < total);
    this.logService.log(records.length);
    this.logUnidentifiedMails();
    return records;
  }
}
