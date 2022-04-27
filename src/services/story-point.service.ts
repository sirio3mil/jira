import { Injectable } from '@nestjs/common';

@Injectable()
export class StoryPointService {
  protected hoursToSeconds(hours: number): number {
    return hours * 60 * 60;
  }

  protected workDaysToSeconds(workDays: number): number {
    return workDays * 60 * 60 * 8;
  }

  protected secondsToHours(seconds: number): number {
    return seconds / 60 / 60;
  }

  protected secondsToWorkDays(seconds: number): number {
    return seconds / 60 / 60 / 8;
  }

  /**
   * 13 puntos -> sprint entero
   * 8 puntos -> 5-7 días
   * 5 puntos -> 3-4 días
   * 3 puntos -> un par de días
   * 2 puntos -> 1 día
   * 1 puntos -> "una mañana"
   * 0,5 -> "un rato"
   * @param storyPoints
   * @param aggregateTimeSpent
   * @returns number
   */
  toSeconds(storyPoints: number, aggregateTimeSpent: number): number {
    if (storyPoints === 0.5) {
      const halfHour = this.hoursToSeconds(0.5);
      if (aggregateTimeSpent <= halfHour) {
        return halfHour;
      }
      const oneHour = this.hoursToSeconds(1);
      if (aggregateTimeSpent <= oneHour) {
        return oneHour;
      }
      return this.hoursToSeconds(2);
    }
    if (storyPoints === 1) {
      return this.hoursToSeconds(4);
    }
    if (storyPoints === 2) {
      return this.workDaysToSeconds(1);
    }
    if (storyPoints === 3) {
      return this.workDaysToSeconds(2);
    }
    if (storyPoints === 13) {
      return this.workDaysToSeconds(10);
    }
    const days = this.secondsToWorkDays(aggregateTimeSpent);
    if (storyPoints === 5) {
      if (days >= 3) {
        return this.workDaysToSeconds(4);
      }
      return this.workDaysToSeconds(3);
    }
    if (storyPoints === 8) {
      if (days >= 6) {
        return this.workDaysToSeconds(7);
      }
      if (days >= 5) {
        return this.workDaysToSeconds(6);
      }
      return this.workDaysToSeconds(5);
    }
    return 0;
  }
}
