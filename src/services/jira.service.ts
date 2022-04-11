import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';

@Injectable()
export class JiraService {
  constructor(private httpService: HttpService) {}

  async findAll(args: string): Promise<any> {
    const config = {
      url: `/search?${args}`,
    };
    return await lastValueFrom(
      this.httpService.get(config.url).pipe(
        map((response) => {
          return response.data;
        }),
      ),
    );
  }

  async findByKey(key: string): Promise<any> {
    const config = {
      url: `/issue/${key}?fields=*all&fieldsByKeys=false`,
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
