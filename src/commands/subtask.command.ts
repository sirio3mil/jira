import { Command } from 'nest-commander';
import { LogService } from '../services/log.service';
import { TeamService } from '../services/team.service';
import { TeamCommand } from './team.command';
import { IssueService } from 'src/services/issue.service';
import { JiraRepository } from 'src/repositories/JiraRepository';

@Command({
  name: 'subtask',
  description: 'Get pair programming stats by subtasks',
})
export class SubtaskCommand extends TeamCommand {
  constructor(
    protected readonly logService: LogService,
    protected readonly teamService: TeamService,
    protected readonly issueService: IssueService,
    protected readonly jiraRepository: JiraRepository,
  ) {
    super(logService, teamService, issueService);
    this.prefix = 'subtasks';
  }

  protected async getIssues() {
    const rows = await this.jiraRepository.getPairProgrammingSubtasks();
    return rows;
  }
}
