import { Command, CommandRunner } from 'nest-commander';
import { JiraService } from '../services/jira.service';
import { LogService } from '../services/log.service';
import { Record } from '../models/record.model';
import { parse } from 'json2csv';
import { createFile } from '../storage.helper';
import { TeamService } from '../services/team.service';
import { Team } from '../models/team.model';
import { StoryPointService } from 'src/services/story-point.service';

@Command({ name: 'storyPoints', description: 'Get story points stats' })
export class StoryPointsCommand implements CommandRunner {
  teams: Team[] = [];

  constructor(
    private readonly logService: LogService,
    private readonly jiraService: JiraService,
    private readonly teamService: TeamService,
    private readonly storyPointService: StoryPointService,
  ) {
    this.teams = this.teamService.getTeams();
  }

  protected getTeamByEmail(email: string, date: Date): any {
    const team = this.teams.find(
      (team) =>
        team.members.filter((member) => {
          const interval = member.membershipIntervals?.find(
            (interval) => date >= interval.start && date <= interval.end,
          );
          return (
            member.email === email &&
            (!member.membershipIntervals?.length || interval)
          );
        }).length > 0,
    );
    return team;
  }

  protected getTeamBySprint(sprint: string[]): any {
    const team = this.teams.find(
      (team) =>
        sprint.filter((description) =>
          description.toLowerCase().includes(team.name.toLowerCase()),
        ).length > 0,
    );
    return team;
  }

  protected getSourceIssue(issueLinks: any[]): string | null {
    for (const issueLink of issueLinks) {
      if (issueLink.type.name === 'Causes') {
        return issueLink.inwardIssue?.key;
      }
    }

    return null;
  }

  async exportIssuesDataToCSV(): Promise<string> {
    return await this.getIssues()
      .then(async (issues) => {
        if (!issues.length) {
          Promise.reject(
            new Error('No issues found. Please check your Jira credentials'),
          );
        }
        const csv = parse(issues, { fields: Object.keys(issues[0]) });
        const dateFileName = new Date().toISOString().replace(/[-:.]/g, '');

        const filePath = `files`;
        const fileName = `issues-${dateFileName}.csv`;

        await createFile(filePath, fileName, csv);

        return Promise.resolve(fileName);
      })
      .catch((error) => Promise.reject(error));
  }

  async run(): Promise<void> {
    this.exportIssuesDataToCSV().then((fileName) => {
      this.logService.log(`${fileName} created`);
    });
  }

  private async getIssues() {
    let startAt = 0;
    let total = 0;
    const maxResults = 50;
    const records: Record[] = [];
    const epics = {};
    do {
      const tasks = await this.jiraService.findAll(startAt, maxResults);
      total = tasks?.total;
      this.logService.log(total);
      this.logService.log(tasks.startAt);
      for (const issue of tasks.issues) {
        let epic = {} as any;
        if (!issue.fields.assignee?.emailAddress) continue;
        this.logService.log(issue.fields.assignee?.emailAddress);
        const date = issue.fields.updated
          ? new Date(issue.fields.updated)
          : new Date(issue.fields.created);
        this.logService.log(date);
        let team: any;
        if (issue.fields.customfield_10105) {
          team = this.getTeamBySprint(issue.fields.customfield_10105);
        }
        if (!team) {
          team = this.getTeamByEmail(issue.fields.assignee.emailAddress, date);
        }
        if (!team) continue;
        this.logService.log(team.name);
        if (!issue.fields.customfield_10106) continue;
        if (!issue.fields.aggregatetimespent) continue;
        const timeEstimate = this.storyPointService.toSeconds(
          issue.fields.customfield_10106,
          issue.fields.aggregatetimespent,
        );
        if (!timeEstimate) continue;
        if (!!issue.fields.customfield_10101) {
          epic = epics[issue.fields.customfield_10101];
          if (!epic) {
            epic = await this.jiraService.findByKey(
              issue.fields.customfield_10101,
            );
            this.logService.log(epic.fields?.summary);
            epics[issue.fields.customfield_10101] = epic;
          }
        }
        let sourceIssue: any;
        if (issue.fields.issuelinks?.length) {
          this.logService.log(`Issue links: ${issue.fields.issuelinks.length}`);
          const sourceIssueKey = this.getSourceIssue(issue.fields.issuelinks);
          if (sourceIssueKey) {
            this.logService.log(`Source Key: ${sourceIssueKey}`);
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
          aggregateTimeSpent: issue.fields.aggregatetimespent,
          timeEstimate,
          created: issue.fields.created,
          updated: issue.fields.updated,
          emailAddress: issue.fields.assignee.emailAddress,
          status: issue.fields.status.name,
          epicKey: issue.fields.customfield_10101,
          epicSummary: epic?.fields?.summary,
          causedByKey: sourceIssue?.key,
          causedBySummary: sourceIssue?.fields?.summary,
        });
      }
      startAt += maxResults;
    } while (total && startAt < total);
    this.logService.log(records.length);
    return records;
  }
}
