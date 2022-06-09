import { Member } from './member.model';

export interface Team {
  name: string;
  stack: string;
  boardID?: number;
  seniority?: number;
  salaries?: number;
  code?: number;
  members?: Member[];
  color: string;
}
