import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { JiraCommand } from './jira.command';
import { JiraService } from './jira.service';
import { LogService } from './log.service';

@Module({
  imports: [HttpModule],
  providers: [LogService, JiraCommand, JiraService],
})
export class AppModule {}
