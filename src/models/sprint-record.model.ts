export interface SprintRecord {
  team: string;
  stack: string;
  week: number;
  sprint: string;
  start: Date;
  end: Date;
  planned: number;
  notPlanned: number;
  finished: number;
  uat: number;
  tested: number;
  deviationFinished: number;
  deviationUat: number;
  deviationTested: number;
  bugs: number;
  defects: number;
}
