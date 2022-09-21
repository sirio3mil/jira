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
import mysql from 'mysql2';
import { JiraRepository } from './repositories/JiraRepository';
import { SubtaskCommand } from './commands/subtask.command';
import { GoalCommand } from './commands/goal.command';
import { BPMCommand } from './commands/bpm.command';
import { WorklogCommand } from './commands/worklog.command';
import { BlockedCommand } from './commands/blocked.command';
import { CostCommand } from './commands/cost.command';

const connectionFactory = {
  provide: "CONNECTION",
  useFactory: async (configService: ConfigService) => {
    return mysql.createConnection({
      host: configService.get('JIRA_MYSQL_HOST'),
      user: configService.get('JIRA_MYSQL_USER'),
      password: configService.get('JIRA_MYSQL_PASSWORD'),
      database: configService.get('JIRA_MYSQL_DB'),
      port: configService.get('JIRA_MYSQL_PORT'),
    });
  },
  inject: [ConfigService],
};

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
    GoalCommand,
    TaskCommand,
    SprintCommand,
    SubtaskCommand,
    BPMCommand,
    WorklogCommand,
    CostCommand,
    BlockedCommand,
    LogService, 
    JiraService, 
    TeamService, 
    IssueService,
    StoryPointService,
    SprintService,
    BoardService,
    JiraRepository,
    connectionFactory,
  ],
  exports: ["CONNECTION"],
})
export class AppModule {}
