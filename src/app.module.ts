import { Module } from '@nestjs/common';
import { JiraCommand } from './jira.command';
import { LogService } from './log.service';

@Module({
  imports: [],
  providers: [LogService, JiraCommand],
})
export class AppModule {}
