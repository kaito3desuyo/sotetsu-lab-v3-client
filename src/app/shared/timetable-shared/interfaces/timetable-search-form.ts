export interface ITimetableSearchForm {
  calendarId: string;
  tripDirection: '0' | '1';
  isSearchStation: boolean;
  stationId?: string;
}
