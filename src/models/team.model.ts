import { Member } from './member.model';

export interface Team {
  name: string;
  seniority?: number;
  salaries?: number;
  code?: number;
  members?: Member[];
  color: string;
}
