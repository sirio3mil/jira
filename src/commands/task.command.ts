import { Command } from 'nest-commander';
import { JiraService } from '../services/jira.service';
import { LogService } from '../services/log.service';
import { TeamService } from '../services/team.service';
import { StoryPointService } from '../services/story-point.service';
import { TeamCommand } from './team.command';
import { Stat } from '../models/stat.model';
import { StatRecord } from '../models/stat-record.model';
import * as fs from 'fs';
import { IssueService } from '../services/issue.service';

@Command({ name: 'task', description: 'Get tasks vs bugs and defects stats' })
export class TaskCommand extends TeamCommand {
  ignoredTasks: string[] = [];
  defaultStartDate = 'startOfMonth()';
  defaultEndDate = 'endOfMonth()';

  constructor(
    protected readonly logService: LogService,
    protected readonly jiraService: JiraService,
    protected readonly teamService: TeamService,
    protected readonly issueService: IssueService,
    protected readonly storyPointService: StoryPointService,
  ) {
    super(logService, teamService, issueService);
    this.prefix = 'tasks';
  }

  protected logInoredTasks() {
    if (this.ignoredTasks.length) {
      const unique = [...new Set(this.ignoredTasks)];
      const dateFileName = new Date().toISOString().replace(/[-:.]/g, '');

      const filePath = this.folder;
      const fileName = `ignored-tasks-${dateFileName}.csv`;
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
      if (issueLink.type.name === 'Relates') {
        return issueLink.inwardIssue?.key;
      }
    }

    return null;
  }

  protected async getIssues(passedParam: string[]) {
    const records: StatRecord[] = [];
    const [tasks, bugs] = await Promise.all([
      this.getTasks(passedParam),
      this.getBugs(passedParam),
    ]);
    this.logInoredTasks();
    this.logUnidentifiedMails();
    for (const team of this.teams) {
      const record: StatRecord = {
        team: team.name,
        taskTimeSpent: tasks[team.name]?.timeSpent || 0,
        bugTimeSpent: bugs[team.name]?.timeSpent || 0,
        tasks: tasks[team.name]?.total || 0,
        bugs: bugs[team.name]?.total || 0,
      };
      records.push(record);
    }
    return records;
  }

  protected async getTasks(passedParam: string[]) {
    let startAt = 0;
    let total = 0;
    const maxResults = 50;
    const stories: any = {};
    const startDate =
      !!passedParam[0] && !isNaN(Date.parse(passedParam[0]))
        ? passedParam[0]
        : this.defaultStartDate;
    const endDate =
      !!passedParam[1] && !isNaN(Date.parse(passedParam[1]))
        ? passedParam[1]
        : this.defaultEndDate;
    do {
      const jql = `jql=created >= ${startDate} AND created <= ${endDate} AND type in (Story,Task) and status = Terminado and project not in ("Service Desk Pruebas") ORDER BY priority DESC, updated DESC&startAt=${startAt}&maxResults=${maxResults}&fields=*all`;
      const tasks = await this.jiraService.findAll(jql);
      total = tasks?.total;
      this.logService.log(`Total: ${total}`);
      for (const issue of tasks.issues) {
        if (!issue.fields.aggregatetimespent) {
          this.logService.log(`No time spent: ${issue.key}`);
          this.ignoredTasks.push(issue.key);
          continue;
        }
        const team = this.getIssueTeam(issue);
        if (!team) continue;
        if (!stories[team.name]) {
          stories[team.name] = { timeSpent: 0, total: 0 } as Stat;
        }
        stories[team.name].total++;
        stories[team.name].timeSpent += this.issueService.getDevelopmentTime(
          issue,
          this.emails,
        );
      }
      startAt += maxResults;
    } while (total && startAt < total);
    return stories;
  }

  protected async getBugs(passedParam: string[]) {
    let startAt = 0;
    let total = 0;
    const maxResults = 50;
    const bugs: any = {};
    const startDate =
      !!passedParam[0] && !isNaN(Date.parse(passedParam[0]))
        ? passedParam[0]
        : this.defaultStartDate;
    const endDate =
      !!passedParam[1] && !isNaN(Date.parse(passedParam[1]))
        ? passedParam[1]
        : this.defaultEndDate;
    do {
      const jql = `jql=created >= ${startDate} AND created <= ${endDate} AND type in (Defecto, Bug)  and status = Terminado and project not in ("Service Desk Pruebas") ORDER BY priority DESC, updated DESC&startAt=${startAt}&maxResults=${maxResults}&fields=*all`;
      const tasks = await this.jiraService.findAll(jql);
      total = tasks?.total;
      this.logService.log(`Total: ${total}`);
      for (const issue of tasks.issues) {
        if (!issue.fields.aggregatetimespent) {
          this.logService.log(`No time spent: ${issue.key}`);
          this.ignoredTasks.push(issue.key);
          continue;
        }
        const team = this.getIssueTeam(issue);
        if (!team) continue;
        if (!bugs[team.name]) {
          bugs[team.name] = { timeSpent: 0, total: 0 } as Stat;
        }
        bugs[team.name].total++;
        bugs[team.name].timeSpent += this.issueService.getDevelopmentTime(
          issue,
          this.emails,
        );
      }
      startAt += maxResults;
    } while (total && startAt < total);
    return bugs;
  }
}
