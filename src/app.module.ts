/* eslint-disable prettier/prettier */
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RatioCommand } from './commands/ratio.command';
import { JiraService } from './services/jira.service';
import { LogService } from './services/log.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TeamService } from './services/team.service';
import { StoryPointService } from './services/story-point.service';
import { BugCommand } from './commands/bug.command';
import { TaskCommand } from './commands/task.command';
import { IssueService } from './services/issue.service';
import { SprintService } from './services/sprint.service';
import { BoardService } from './services/board.service';
import { SprintCommand } from './commands/sprint.command';

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
  providers: [
    RatioCommand, 
    BugCommand, 
    TaskCommand,
    SprintCommand,
    LogService, 
    JiraService, 
    TeamService, 
    IssueService,
    StoryPointService,
    SprintService,
    BoardService
  ],
})
export class AppModule {}
