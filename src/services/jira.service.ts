import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';

@Injectable()
export class JiraService {
  constructor(private httpService: HttpService) {}

  async findAll(args: string): Promise<any> {
    const config = {
      url: `/rest/api/2/search?${args}`,
    };
    return await lastValueFrom(
      this.httpService.get(config.url).pipe(
        map((response) => {
          return response.data;
        }),
      ),
    );
  }

  async findByKey(key: string, fields = '*all'): Promise<any> {
    const config = {
      url: `/rest/api/2/issue/${key}?fields=${fields}&fieldsByKeys=false`,
    };
    return await lastValueFrom(
      this.httpService.get(config.url).pipe(
        map((response) => {
          return response.data;
        }),
      ),
    );
  }

  async findByEpic(epicKey: string, fields = '*all'): Promise<any> {
    const config = {
      url: `/rest/agile/1.0/epic/${epicKey}/issue?fields=${fields}&fieldsByKeys=false`,
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
