import { Command } from 'nest-commander';
import { JiraService } from '../services/jira.service';
import { LogService } from '../services/log.service';
import { IssueService } from 'src/services/issue.service';
import { Record } from '../models/record.model';
import { TeamService } from '../services/team.service';
import { StoryPointService } from 'src/services/story-point.service';
import { TeamCommand } from './team.command';
import { BoardService } from 'src/services/board.service';
import { SprintService } from 'src/services/sprint.service';
import { Sprint } from 'src/models/sprint.model';

@Command({ name: 'sprint', description: 'Get sprints stats' })
export class SprintCommand extends TeamCommand {
  constructor(
    protected readonly logService: LogService,
    protected readonly jiraService: JiraService,
    protected readonly teamService: TeamService,
    protected readonly issueService: IssueService,
    protected readonly storyPointService: StoryPointService,
    protected readonly boardService: BoardService,
    protected readonly sprintService: SprintService,
  ) {
    super(logService, teamService, issueService);
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
    return orderedSprints.slice(0, 10);
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
    for (const team of this.teams) {
      if (!team.boardID) continue;
      const sprints = await this.getLastsClosedSprints(team.boardID);
      this.logService.log(`Sprints found: ${sprints.length}`);
      for (const sprint of sprints) {
        this.logService.log(`Sprint: ${sprint.name}`);
        const issues = await this.getSprintIssues(team.boardID, sprint.id);
        for (const issue of issues) {
          this.logService.log(`Issue: ${issue.key}`);
        }
      }
    }
    return [];
  }
}
