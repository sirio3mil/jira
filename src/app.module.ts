import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { StoryPointsCommand } from './commands/story-points.command';
import { JiraService } from './services/jira.service';
import { LogService } from './services/log.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TeamService } from './services/team.service';

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
  providers: [LogService, StoryPointsCommand, JiraService, TeamService],
})
export class AppModule {}
