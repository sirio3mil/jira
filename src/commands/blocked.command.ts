import { Command } from 'nest-commander';
import { LogService } from '../services/log.service';
import { TeamService } from '../services/team.service';
import { TeamCommand } from './team.command';
import { IssueService } from '../services/issue.service';
import { JiraRepository } from '../repositories/JiraRepository';
import { JiraService } from '../services/jira.service';

@Command({
  name: 'blocked',
  description: 'Get blocked issues status changes',
})
export class BlockedCommand extends TeamCommand {
  constructor(
    protected readonly logService: LogService,
    protected readonly teamService: TeamService,
    protected readonly issueService: IssueService,
    protected readonly jiraRepository: JiraRepository,
    protected readonly jiraService: JiraService,
  ) {
    super(logService, teamService, issueService);
    this.prefix = 'blocked';
  }

  protected async getIssues() {
    const teamLeadersEmails = this.teamService.getTeamLeaders();
    const teamLeaders = teamLeadersEmails.map((email) =>
      email.replace('@digimobil.es', ''),
    );
    const rows = await this.jiraRepository.getBlockedIssuesStatusChanges(
      teamLeaders,
    );
    const results = teamLeaders.reduce((a, v) => ({ ...a, [v]: 0 }), {});
    this.logService.log(`${rows.length}`);
    let previous: any;
    await rows.forEach(async (row) => {
      if (previous?.pkey === row.pkey) {
        if (previous.newvalue !== row.newvalue && +row.newvalue !== 10118) {
          const startTime = new Date(previous.created);
          const endTime = new Date(row.created);
          const difference = endTime.getTime() - startTime.getTime();
          const resultInMinutes = Math.round(difference / 60000);
          results[row.lower_user_name] += resultInMinutes;
        }
      } else if (previous?.pkey && previous.newvalue === 10118) {
        // check if last status is blocked
        const latest = await this.jiraRepository.getLatestIssueStatus(
          +previous.id,
        );
        if (+latest[0].id === +previous.id) {
          const startTime = new Date(previous.created);
          const endTime = new Date();
          const difference = endTime.getTime() - startTime.getTime();
          const resultInMinutes = Math.round(difference / 60000);
          results[previous.lower_user_name] += resultInMinutes;
        }
      }
      previous = { ...row };
    });
    return Object.keys(results).map(function (key) {
      return {
        tl: key,
        time: results[key],
      };
    });
  }
}
