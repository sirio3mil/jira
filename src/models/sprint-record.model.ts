export interface SprintRecord {
  team: string;
  week: string;
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
