import { Command, CommandRunner } from 'nest-commander';
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
    while (total && startAt + maxResults < total) {
      startAt += maxResults;
      tasks = await this.jiraService.findAll(startAt, maxResults);
      this.logService.log(tasks.startAt);
    }
  }
}
