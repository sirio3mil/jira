import { Command, CommandRunner } from 'nest-commander';
import { JiraService } from './jira.service';
import { LogService } from './log.service';
import { Record } from './record.model';
import { parse } from 'json2csv';
import { createFile } from './storage.helper';
import { TeamService } from './team.service';
import { Team } from './team.model';

@Command({ name: 'jira', description: 'A parameter parse' })
export class JiraCommand implements CommandRunner {
  teams: Team[] = [];

  constructor(
    private readonly logService: LogService,
    private readonly jiraService: JiraService,
    private readonly teamService: TeamService,
  ) {
    this.teams = this.teamService.getTeams();
  }

  protected hoursToSeconds(hours: number): number {
    return hours * 60 * 60;
  }

  protected workDaysToSeconds(workDays: number): number {
    return workDays * 60 * 60 * 8;
  }

  protected secondsToHours(seconds: number): number {
    return seconds / 60 / 60;
  }

  protected secondsToWorkDays(seconds: number): number {
    return seconds / 60 / 60 / 8;
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

  /**
   * 13 puntos -> sprint entero
   * 8 puntos -> 5-7 días
   * 5 puntos -> 3-4 días
   * 3 puntos -> un par de días
   * 2 puntos -> 1 día
   * 1 puntos -> "una mañana"
   * 0,5 -> "un rato"
   * @param storyPoints
   * @param aggregateTimeSpent
   * @returns number
   */
  protected translateStoryPoints(
    storyPoints: number,
    aggregateTimeSpent: number,
  ): number {
    if (storyPoints === 0.5) {
      return this.hoursToSeconds(2);
    }
    if (storyPoints === 1) {
      return this.hoursToSeconds(4);
    }
    if (storyPoints === 2) {
      return this.workDaysToSeconds(1);
    }
    if (storyPoints === 3) {
      return this.workDaysToSeconds(2);
    }
    if (storyPoints === 13) {
      return this.workDaysToSeconds(10);
    }
    const days = this.secondsToWorkDays(aggregateTimeSpent);
    if (storyPoints === 5) {
      if (days >= 3) {
        return this.workDaysToSeconds(4);
      }
      return this.workDaysToSeconds(3);
    }
    if (storyPoints === 8) {
      if (days >= 6) {
        return this.workDaysToSeconds(7);
      }
      if (days >= 5) {
        return this.workDaysToSeconds(6);
      }
      return this.workDaysToSeconds(5);
    }
    return 0;
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
        const timeEstimate = this.translateStoryPoints(
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
