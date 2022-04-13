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
    LogService, 
    RatioCommand, 
    BugCommand, 
    JiraService, 
    TeamService, 
    StoryPointService
  ],
})
export class AppModule {}
