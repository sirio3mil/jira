import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';

@Injectable()
export class JiraService {
  constructor(private httpService: HttpService) {}

  async findAll(startAt = 0, maxResults = 50): Promise<any> {
    const config = {
      url: `/search?jql=status = Terminado AND created > startOfMonth() AND type in (standardIssueTypes()) ORDER BY priority DESC, updated DESC&startAt=${startAt}&maxResults=${maxResults}&fields=*all`,
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
