const mockStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
};

jest.mock('localforage', () => ({
    __esModule: true,
    default: mockStorage,
}));

describe('OperationTableStore の保存', () => {
    beforeEach(() => {
        jest.resetModules();
        mockStorage.getItem.mockReset();
        mockStorage.setItem.mockReset();
    });

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    it('旧い丸ごと保存の値を読んだ後、保存先には設定だけが残る', async () => {
        // 運用群を持たない古い値（persistState 自身は書き戻さない形）
        mockStorage.getItem.mockResolvedValue({
            operationTrips: [{ operation: { operationId: 'old' } }],
            calendar: { calendarId: 'old' },
            loadingQueue: [true],
        });
        mockStorage.setItem.mockResolvedValue(undefined);

        await import('./operation-table.store');
        await flush();

        expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
        expect(mockStorage.setItem).toHaveBeenCalledWith(
            'OperationTableStore',
            { selectedGroupNames: [] },
        );
    });

    it('運用群の選択は書き戻しでも残る', async () => {
        mockStorage.getItem.mockResolvedValue({
            selectedGroupNames: ['1群'],
            operationTrips: [{ operation: { operationId: 'old' } }],
        });
        mockStorage.setItem.mockResolvedValue(undefined);

        await import('./operation-table.store');
        await flush();

        expect(mockStorage.setItem).toHaveBeenLastCalledWith(
            'OperationTableStore',
            { selectedGroupNames: ['1群'] },
        );
    });

    it('書き戻しに失敗しても握りつぶす', async () => {
        mockStorage.getItem.mockResolvedValue({ calendar: null });
        // 1 拍遅らせて失敗させる（すぐ失敗させると Zone が未処理の拒否として扱う）
        mockStorage.setItem.mockImplementation(
            () =>
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('quota')), 0),
                ),
        );

        await import('./operation-table.store');
        await flush();
        await flush();

        expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
    });
});
