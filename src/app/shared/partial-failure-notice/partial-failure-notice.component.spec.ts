import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PartialFailureNoticeComponent } from './partial-failure-notice.component';

describe('PartialFailureNoticeComponent', () => {
    let fixture: ComponentFixture<PartialFailureNoticeComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [PartialFailureNoticeComponent],
        });
        fixture = TestBed.createComponent(PartialFailureNoticeComponent);
        fixture.detectChanges();
    });

    it('role="status" で知らせの文言を出す', () => {
        const note = (fixture.nativeElement as HTMLElement).querySelector(
            'p[role="status"]',
        );
        expect(note?.textContent).toContain('一部の情報を取得できませんでした');
    });
});
