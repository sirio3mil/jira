import { Interval } from './interval.model';

export interface Member {
  name?: string;
  email?: string;
  membershipIntervals?: Interval[];
  seniorityDate: Date;
  active: boolean;
  role: string;
  salary: number;
  seniority: number;
}
