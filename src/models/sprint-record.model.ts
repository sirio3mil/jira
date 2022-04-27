export interface SprintRecord {
  team: string;
  week: string;
  start: Date;
  end: Date;
  planned: number;
  finished: number;
  notPlanned: number;
  bugs: number;
  defects: number;
  deviation: number;
}
