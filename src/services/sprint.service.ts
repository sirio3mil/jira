import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';

@Injectable()
export class SprintService {
  static readonly STATUS_ACTIVE = 'active';
  static readonly STATUS_CLOSED = 'closed';
  static readonly STATUS_FUTURE = 'future';

  constructor(private httpService: HttpService) {}

  async getSprintsByBoardID(
    boardID: number,
    status: string,
    startAt = 0,
  ): Promise<any> {
    const config = {
      url: `/rest/agile/1.0/board/${boardID}/sprint?startAt=${startAt}&state=${status}`,
    };
    return await lastValueFrom(
      this.httpService.get(config.url).pipe(
        map((response) => {
          return response.data;
        }),
      ),
    );
  }

  async getIssuesBySprintID(
    boardID: number,
    sprintID: number,
    startAt = 0,
  ): Promise<any> {
    const config = {
      url: `/rest/agile/1.0/board/${boardID}/sprint/${sprintID}/issue?expand=changelog&fields=changelog,id,key,summary,aggregatetimespent,assignee,status,issuetype,worklog,customfield_10106&startAt=${startAt}&jql=type in (standardIssueTypes())`,
    };
    return await lastValueFrom(
      this.httpService.get(config.url).pipe(
        map((response) => {
          return response.data;
        }),
      ),
    );
  }
}
