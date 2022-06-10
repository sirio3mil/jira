export interface SprintRecord {
  team: string;
  stack: string;
  week: number;
  sprint: string;
  start: Date;
  end: Date;
  planned: number;
  finished: number;
  tested: number;
  uat: number;
  notPlanned: number;
  bugs: number;
  defects: number;
  deviationFinished: number;
  deviationTested: number;
  deviationUat: number;
}
