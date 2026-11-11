/** 投稿フォームをどこから開いたか（GA の source。M30 の入口の使われ方を見るため） */
export type OperationPostSource =
    | 'top_card'
    | 'realtime_fab'
    | 'realtime_operation_card'
    | 'realtime_formation_card'
    | 'train_diagram'
    | 'train_location'
    | 'timetable_station';
