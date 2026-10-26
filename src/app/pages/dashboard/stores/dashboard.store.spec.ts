// 他の spec とグローバルの名前がぶつからないよう、モジュールとして扱う
export {};

const mockStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
};

jest.mock('localforage', () => ({
    __esModule: true,
    default: mockStorage,
}));

describe('DashboardStore の保存', () => {
    beforeEach(() => {
        jest.resetModules();
        mockStorage.getItem.mockReset();
        mockStorage.setItem.mockReset();
    });

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    it('旧い丸ごと保存の値を読んだ後、保存先には設定だけが残る', async () => {
        // 既訪問フラグは既定値のまま（変わらないので、persistState 自身は書き戻さない）
        mockStorage.getItem.mockResolvedValue({
            hasVisitedBefore: false,
            runningTripCount: 999,
            latestSightings: [{ operationSightingId: 'old' }],
            loadingQueue: [true],
        });
        mockStorage.setItem.mockResolvedValue(undefined);

        await import('./dashboard.store');
        await flush();

        expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
        expect(mockStorage.setItem).toHaveBeenCalledWith('DashboardStore', {
            hasVisitedBefore: false,
        });
    });

    it('書き戻しに失敗しても握りつぶす', async () => {
        mockStorage.getItem.mockResolvedValue({ hasVisitedBefore: false });
        // 1 拍遅らせて失敗させる（すぐ失敗させると Zone が未処理の拒否として扱う）
        mockStorage.setItem.mockImplementation(
            () =>
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('quota')), 0),
                ),
        );

        await import('./dashboard.store');
        await flush();
        await flush();

        expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
    });
});
