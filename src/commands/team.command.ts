import { CommandRunner } from 'nest-commander';
import { LogService } from '../services/log.service';
import { parse } from 'json2csv';
import { createFile } from '../storage.helper';
import { TeamService } from '../services/team.service';
import { Team } from '../models/team.model';

export abstract class TeamCommand implements CommandRunner {
  teams: Team[] = [];

  constructor(
    protected readonly logService: LogService,
    protected readonly teamService: TeamService,
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

  async exportIssuesDataToCSV(passedParam: string[]): Promise<string> {
    return await this.getIssues(passedParam)
      .then(async (issues: any[]) => {
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
      .catch((error: any) => Promise.reject(error));
  }

  async run(passedParam: string[]): Promise<void> {
    this.exportIssuesDataToCSV(passedParam).then((fileName) => {
      this.logService.log(`${fileName} created`);
    });
  }

  protected abstract getIssues(passedParam: string[]);
}
