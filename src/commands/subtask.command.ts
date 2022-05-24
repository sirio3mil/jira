import { Command } from 'nest-commander';
import { LogService } from '../services/log.service';
import { TeamService } from '../services/team.service';
import { TeamCommand } from './team.command';
import { IssueService } from 'src/services/issue.service';
import { JiraRepository } from 'src/repositories/JiraRepository';
import { createFile } from '../storage.helper';
import { parse } from 'json2csv';

@Command({
  name: 'subtask',
  description: 'Get pair programming stats by subtasks',
})
export class SubtaskCommand extends TeamCommand {
  timeByUserMain = [];
  timeByUserPair = [];

  constructor(
    protected readonly logService: LogService,
    protected readonly teamService: TeamService,
    protected readonly issueService: IssueService,
    protected readonly jiraRepository: JiraRepository,
  ) {
    super(logService, teamService, issueService);
    this.prefix = 'multi-user-subtasks';
  }

  protected async logSingleUserSubtasks(rows) {
    const dateFileName = new Date().toISOString().replace(/[-:.]/g, '');
    const filePath = this.folder;
    const fileName = `single-user-subtasks-${dateFileName}.csv`;
    for (const row of rows) {
      if (!this.timeByUserMain[row.author]) {
        this.timeByUserMain[row.author] = 0;
      }
      this.timeByUserMain[row.author] += parseInt(row.timeworked);
    }
    const csv = parse(rows, { fields: Object.keys(rows[0]) });
    await createFile(filePath, fileName, csv);
    return Promise.resolve(fileName);
  }

  protected async logTimeByUserMain(rows) {
    const dateFileName = new Date().toISOString().replace(/[-:.]/g, '');
    const fileName = `time-user-main-${dateFileName}.csv`;
    if (rows.length > 0) {
      const filePath = this.folder;
      const csv = parse(rows, { fields: Object.keys(rows[0]) });
      await createFile(filePath, fileName, csv);
    }
    return Promise.resolve(fileName);
  }

  protected async logTimeByUserPair(rows) {
    const dateFileName = new Date().toISOString().replace(/[-:.]/g, '');
    const fileName = `time-user-pair-${dateFileName}.csv`;
    if (rows.length > 0) {
      const filePath = this.folder;
      const csv = parse(rows, { fields: Object.keys(rows[0]) });
      await createFile(filePath, fileName, csv);
    }
    return Promise.resolve(fileName);
  }

  protected async getIssues() {
    const project = 11001;
    const date = '2022-04-01';
    const results: any[] = [];
    const [singleUSerSubtasks, rows] = await Promise.all([
      this.jiraRepository.getSingleUSerSubtasks(project, date),
      this.jiraRepository.getPairProgrammingSubtasks(project, date),
    ]);
    await this.logSingleUserSubtasks(singleUSerSubtasks);
    let mainRow = null;
    for (const row of rows) {
      const newRow = { ...row, pairTime: 0 };
      if (!mainRow || mainRow.issueID !== row.issueID) {
        mainRow = { ...row };
        if (!this.timeByUserMain[row.author]) {
          this.timeByUserMain[row.author] = 0;
        }
        this.timeByUserMain[row.author] += parseInt(row.timeworked);
      } else {
        newRow.pairTime = row.timeworked;
        newRow.timeworked = 0;
        if (!this.timeByUserPair[row.author]) {
          this.timeByUserPair[row.author] = 0;
        }
        this.timeByUserPair[row.author] += parseInt(row.timeworked);
      }
      results.push(newRow);
    }
    const main = [];
    Object.keys(this.timeByUserMain).forEach((index) => {
      main.push({
        user: index,
        time: this.timeByUserMain[index],
      });
    });
    const pair = [];
    Object.keys(this.timeByUserPair).forEach((index) => {
      pair.push({
        user: index,
        time: this.timeByUserPair[index],
      });
    });
    await Promise.all([
      this.logTimeByUserMain(main),
      this.logTimeByUserPair(pair),
    ]);
    return results;
  }
}
