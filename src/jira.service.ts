import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';

@Injectable()
export class JiraService {
  constructor(private httpService: HttpService) {}

  async findAll(): Promise<any> {
    const config = {
      method: 'get',
      url: '',
      headers: {
        Authorization: '',
        Cookie: '',
      },
    };
    return await lastValueFrom(
      this.httpService
        .get(config.url, {
          headers: config.headers,
        })
        .pipe(
          map((response) => {
            return response.data;
          }),
        ),
    );
  }
}
