export interface Member {
  name?: string;
  email?: string;
  membershipIntervals?: {
    start?: Date;
    end?: Date;
  }[];
  seniorityDate: Date;
  active: boolean;
  role: string;
  salary: number;
}
