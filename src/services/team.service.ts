import { Injectable } from '@nestjs/common';
import { Team } from '../models/team.model';
import stacks from '../config/teams.json';

@Injectable()
export class TeamService {
  codes = {
    tl: () => 1000,
    senior: () => 100,
    middle: () => 10,
    junior: () => 1,
  };

  monthDiff(seniorityDate: Date) {
    const today = new Date();
    let months: number;
    months = (today.getFullYear() - seniorityDate.getFullYear()) * 12;
    months -= seniorityDate.getMonth();
    months += today.getMonth();
    return months <= 0 ? 0 : months;
  }

  getTeams(): Team[] {
    const teams: Team[] = [];
    stacks.teams.forEach((team) => {
      let seniority = 0;
      let salaries = 0;
      let code = 0;
      const members = team.members.map((member) => {
        code += this.codes[member.role]();
        salaries += member.salary;
        const seniorityDate = new Date(member.seniorityDate);
        seniority += this.monthDiff(seniorityDate);
        return {
          name: member.name,
          email: member.email,
          membershipIntervals: member.membershipIntervals?.map((interval) => {
            return {
              start: interval?.start ? new Date(interval.start) : seniorityDate,
              end: interval?.end ? new Date(interval.end) : new Date(),
            };
          }),
          seniorityDate,
          active: !!member.active,
          role: member.role,
          salary: member.salary,
        };
      });
      teams.push({
        name: team.name,
        color: team.color || team.stack,
        seniority,
        salaries,
        code,
        members: members.filter((member) => {
          if (!member.membershipIntervals?.length) {
            return true;
          }
          const today = new Date();
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          const interval = member.membershipIntervals?.find(
            (interval) => today >= interval.start && firstDay <= interval.end,
          );
          return !!interval;
        }),
      });
    });

    return teams;
  }
}
