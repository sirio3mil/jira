export interface Sprint {
  id: number;
  state: string;
  name: string;
  startDate: Date;
  endDate: Date;
  completeDate?: Date;
  activatedDate: Date;
  originBoardId: number;
  goal: string;
  synced: boolean;
}
