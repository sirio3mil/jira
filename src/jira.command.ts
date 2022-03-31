import { Command, CommandRunner } from 'nest-commander';
import { JiraService } from './jira.service';
import { LogService } from './log.service';
import { Record } from './record.model';
import { parse } from 'json2csv';
import { createFile } from './storage.helper';

@Command({ name: 'jira', description: 'A parameter parse' })
export class JiraCommand implements CommandRunner {
  constructor(
    private readonly logService: LogService,
    private readonly jiraService: JiraService,
  ) {}

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
        const csv = parse(issues, { fields: Object.keys(issues[0]) });

        const filePath = `files`;
        const fileName = `issues-${new Date().toISOString()}.csv`;

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
    const maxResults = 50;
    let tasks = await this.jiraService.findAll(startAt, maxResults);
    const total = tasks?.total;
    this.logService.log(total);
    const records: Record[] = [];
    while (total && startAt + maxResults < total) {
      startAt += maxResults;
      tasks = await this.jiraService.findAll(startAt, maxResults);
      this.logService.log(tasks.startAt);
      tasks.issues.forEach((issue) => {
        records.push({
          key: issue.key,
          issueType: issue.fields.issuetype.name,
          projectName: issue.fields.project.name,
          aggregateTimeSpent: issue.fields.aggregatetimespent,
          timeEstimate: this.translateStoryPoints(
            issue.fields.customfield_10106,
            issue.fields.aggregatetimespent,
          ),
          created: issue.fields.created,
          updated: issue.fields.updated,
          emailAddress: issue.fields.assignee?.emailAddress,
          status: issue.fields.status.name,
        });
      });
    }
    return records;
  }
}
