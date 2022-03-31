import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { JiraCommand } from './jira.command';
import { JiraService } from './jira.service';
import { LogService } from './log.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get('JIRA_BASE_URL'),
        headers: {
          Authorization: configService.get('JIRA_AUTH'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [LogService, JiraCommand, JiraService],
})
export class AppModule {}
