import { CommandRunner } from 'nest-commander';
import { LogService } from '../services/log.service';
import { parse } from 'json2csv';
import { createFile } from '../storage.helper';
import { TeamService } from '../services/team.service';
import { Team } from '../models/team.model';
import { IssueService } from 'src/services/issue.service';
import * as fs from 'fs';

export abstract class TeamCommand extends CommandRunner {
  teams: Team[] = [];
  emails: string[] = [];
  prefix = 'issues';
  folder = 'files';
  unidentifiedMails: string[] = [];

  constructor(
    protected readonly logService: LogService,
    protected readonly teamService: TeamService,
    protected readonly issueService: IssueService,
  ) {
    super();
    this.teams = this.teamService.getTeams();
    this.emails = this.teamService.getEmails();
  }

  protected getTeamByEmail(email: string, date: Date): Team {
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

  protected getTeamBySprint(sprints: string[]): Team {
    const team = this.teams.find(
      (team) =>
        sprints.filter((description) =>
          description.toLowerCase().includes(team.name.toLowerCase()),
        ).length > 0,
    );
    return team;
  }

  protected getTeamByFields(
    sprints: string[],
    email: string,
    date: Date,
  ): Team {
    let team: any;
    if (sprints?.length) {
      team = this.getTeamBySprint(sprints);
    }
    if (!team && email) {
      team = this.getTeamByEmail(email, date);
      if (!team) {
        this.logService.log('No team found for ' + email);
        this.unidentifiedMails.push(email);
      }
    }
    return team;
  }

  protected getIssueTeam(issue: any): Team {
    return this.getTeamByFields(
      issue.fields.customfield_10105,
      issue.fields.assignee.emailAddress,
      this.issueService.getResolutionDate(issue),
    );
  }

  protected logUnidentifiedMails() {
    if (this.unidentifiedMails.length) {
      const unique = [...new Set(this.unidentifiedMails)];
      const dateFileName = new Date().toISOString().replace(/[-:.]/g, '');

      const filePath = this.folder;
      const fileName = `unidentified-mails-${dateFileName}.csv`;

      const file = fs.createWriteStream(`${filePath}/${fileName}`);
      file.on('error', function (err) {
        this.logService.log(err);
      });
      unique.forEach(function (item) {
        file.write(item + '\n');
      });
      file.end();
    }
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

        const filePath = this.folder;
        const fileName = `${this.prefix}-${dateFileName}.csv`;

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
