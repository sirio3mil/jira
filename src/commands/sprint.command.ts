import { Command } from 'nest-commander';
import { JiraService } from '../services/jira.service';
import { LogService } from '../services/log.service';
import { IssueService } from 'src/services/issue.service';
import { TeamService } from '../services/team.service';
import { TeamCommand } from './team.command';
import { SprintService } from 'src/services/sprint.service';
import { Sprint } from 'src/models/sprint.model';
import { SprintRecord } from 'src/models/sprint-record.model';

@Command({ name: 'sprint', description: 'Get sprints stats' })
export class SprintCommand extends TeamCommand {
  sprintsByBoard = 1;

  constructor(
    protected readonly logService: LogService,
    protected readonly jiraService: JiraService,
    protected readonly teamService: TeamService,
    protected readonly issueService: IssueService,
    protected readonly sprintService: SprintService,
  ) {
    super(logService, teamService, issueService);
    this.prefix = 'sprints';
  }

  protected async getBoardSprints(boardID: number): Promise<Sprint[]> {
    let lastPage = false;
    let sprints: Sprint[] = [];
    let startAt = 0;
    do {
      const response = await this.sprintService.getClosedSprintsByBoardID(
        boardID,
        startAt,
      );
      lastPage = response.isLast;
      startAt = response.startAt + response.maxResults;
      this.logService.log(`Is last page: ${lastPage}`);
      this.logService.log(`Next iteration will start at: ${startAt}`);
      this.logService.log(`Sprints found: ${response.values.length}`);
      sprints = sprints.concat(
        response.values.map((sprint: any) => {
          return {
            id: sprint.id,
            state: sprint.state,
            name: sprint.name,
            startDate: new Date(sprint.startDate),
            endDate: new Date(sprint.endDate),
            completeDate: sprint.completeDate
              ? new Date(sprint.completeDate)
              : null,
            activatedDate: new Date(sprint.activatedDate),
            originBoardId: sprint.originBoardId,
            goal: sprint.goal,
            synced: sprint.synced,
          };
        }),
      );
    } while (!lastPage);
    return sprints;
  }

  protected async getLastsClosedSprints(boardID: number): Promise<Sprint[]> {
    const sprints = await this.getBoardSprints(boardID);
    const orderedSprints = sprints.sort(
      (a, b) => b.endDate.getTime() - a.endDate.getTime(),
    );
    return orderedSprints.slice(0, this.sprintsByBoard);
  }

  protected async getSprintIssues(
    boardID: number,
    sprintID: number,
  ): Promise<any[]> {
    let issues: any[] = [];
    let startAt = 0;
    let total = 0;
    let maxResults = 0;
    do {
      const response = await this.sprintService.getIssuesBySprintID(
        boardID,
        sprintID,
        startAt,
      );
      total = response.total;
      maxResults = response.maxResults;
      startAt += maxResults;
      issues = issues.concat(response.issues);
    } while (total && startAt < total);
    return issues;
  }

  protected async getIssues() {
    const records: SprintRecord[] = [];
    for (const team of this.teams) {
      if (!team.boardID) continue;
      if (team.boardID !== 79) continue;
      const sprints = await this.getLastsClosedSprints(team.boardID);
      this.logService.log(`Sprints filtered: ${sprints.length}`);
      for (const sprint of sprints) {
        const record: SprintRecord = {
          team: team.name,
          week: sprint.name,
          start: sprint.startDate,
          end: sprint.endDate,
          planned: 0,
          finished: 0,
          notPlanned: 0,
          bugs: 0,
          defects: 0,
          deviation: 0,
        };
        this.logService.log(`Sprint: ${sprint.name}`);
        const issues = await this.getSprintIssues(team.boardID, sprint.id);
        for (const issue of issues) {
          const sprintIssue = this.issueService.getSprintIssue(sprint, issue);
          if (sprintIssue.planned) {
            record.planned += sprintIssue.storyPoints;
          } else {
            record.notPlanned += sprintIssue.storyPoints;
          }
          if (sprintIssue.finished) {
            record.finished += sprintIssue.storyPoints;
          }
          if (sprintIssue.type === this.issueService.ERROR) {
            record.bugs++;
          }
          if (sprintIssue.type === this.issueService.DEFECT) {
            record.defects++;
          }
        }
        record.deviation = record.planned + record.notPlanned - record.finished;
        records.push(record);
      }
    }
    return records;
  }
}
