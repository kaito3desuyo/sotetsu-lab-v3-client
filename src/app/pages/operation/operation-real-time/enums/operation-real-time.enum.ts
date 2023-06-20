export const OperationRealTimeTableColumn = {
    OPERATION_NUMBER: 'operationNumber',
    FORMATION_NUMBER: 'formationNumber',
    CURRENT_POSITION: 'currentPosition',
    SIGHTING_TIME: 'sightingTime',
    UPDATED_AT: 'updatedAt',
} as const;
export type OperationRealTimeTableColumn =
    (typeof OperationRealTimeTableColumn)[keyof typeof OperationRealTimeTableColumn];

export const OperationRealTimeTableColumnLabel = {
    [OperationRealTimeTableColumn.OPERATION_NUMBER]: '運用',
    [OperationRealTimeTableColumn.FORMATION_NUMBER]: '編成',
    [OperationRealTimeTableColumn.CURRENT_POSITION]: '現在位置',
    [OperationRealTimeTableColumn.SIGHTING_TIME]: '目撃時刻',
    [OperationRealTimeTableColumn.UPDATED_AT]: '最終更新',
} as const;
export type OperationRealTimeTableColumnLabel =
    (typeof OperationRealTimeTableColumnLabel)[keyof typeof OperationRealTimeTableColumnLabel];
