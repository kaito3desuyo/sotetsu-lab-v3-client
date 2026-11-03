export interface InvalidateManyOperationSightingsResultDto {
    invalidated: string[];
    skipped: { id: string; reason: 'not_found' | 'already_invalidated' }[];
    failed: { id: string; message: string } | null;
    /** api が時間で区切って手を付けなかった id。service が送り直し、10 回で尽きた分だけ残る */
    pending: string[];
}
