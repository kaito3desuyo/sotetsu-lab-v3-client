export interface InvalidateManyOperationSightingsResultModel {
    invalidated: string[];
    skipped: { id: string; reason: 'not_found' | 'already_invalidated' }[];
    failed: { id: string; message: string } | null;
    pending: string[];
}
