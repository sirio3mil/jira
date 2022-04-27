import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';

@Injectable()
export class BoardService {
  constructor(private httpService: HttpService) {}

  async getScrumBoards(): Promise<any> {
    const config = {
      url: `/rest/agile/1.0/board?type=scrum`,
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
