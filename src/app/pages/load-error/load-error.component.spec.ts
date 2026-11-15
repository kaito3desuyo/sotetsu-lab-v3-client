import { TestBed } from '@angular/core/testing';
import { APP_LOCATION } from 'src/app/core/services/app-update.service';
import { LoadErrorComponent } from './load-error.component';

describe('LoadErrorComponent', () => {
    const reload = jest.fn();

    beforeEach(() => {
        reload.mockClear();
        TestBed.configureTestingModule({
            imports: [LoadErrorComponent],
            providers: [
                {
                    provide: APP_LOCATION,
                    useValue: { reload, assign: jest.fn() },
                },
            ],
        });
    });

    it('読み込めなかったことと、待ってから試すことを伝える', () => {
        const fixture = TestBed.createComponent(LoadErrorComponent);
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        expect(text).toContain('読み込めませんでした');
        expect(text).toContain('時間をおいてお試しください。');
        expect(text).toContain('もう一度読み込む');
    });

    it('もう一度読み込むと、ページを丸ごと読み込み直す', () => {
        const fixture = TestBed.createComponent(LoadErrorComponent);
        fixture.detectChanges();

        (fixture.nativeElement as HTMLElement).querySelector('button')?.click();

        expect(reload).toHaveBeenCalledTimes(1);
    });
});
