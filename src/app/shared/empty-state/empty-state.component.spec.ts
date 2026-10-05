import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
    let component: EmptyStateComponent;
    let fixture: ComponentFixture<EmptyStateComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [EmptyStateComponent],
        });

        fixture = TestBed.createComponent(EmptyStateComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        fixture.componentRef.setInput('message', 'この条件の列車情報はありません');
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('message を表示する', () => {
        fixture.componentRef.setInput(
            'message',
            'この条件の列車情報はありません',
        );
        fixture.detectChanges();

        const text: string = fixture.nativeElement.textContent;
        expect(text).toContain('この条件の列車情報はありません');
    });

    it('icon 未指定時は mat-icon を描画しない', () => {
        fixture.componentRef.setInput('message', 'メッセージ');
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('mat-icon'))).toBeNull();
    });

    it('icon 指定時は mat-icon をその名前で描画する', () => {
        fixture.componentRef.setInput('message', 'メッセージ');
        fixture.componentRef.setInput('icon', 'train');
        fixture.detectChanges();

        const iconEl = fixture.debugElement.query(By.css('mat-icon'));
        expect(iconEl).not.toBeNull();
        expect((iconEl.nativeElement.textContent as string).trim()).toBe(
            'train',
        );
    });

    it('actionLabel 未指定時はボタンを描画しない', () => {
        fixture.componentRef.setInput('message', 'メッセージ');
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('button'))).toBeNull();
    });

    it('actionLabel 指定時のみボタンを描画し、ラベルを表示する', () => {
        fixture.componentRef.setInput('message', 'メッセージ');
        fixture.componentRef.setInput('actionLabel', '下り時刻表を表示する');
        fixture.detectChanges();

        const buttonEl = fixture.debugElement.query(By.css('button'));
        expect(buttonEl).not.toBeNull();
        expect(
            (buttonEl.nativeElement.textContent as string).trim(),
        ).toContain('下り時刻表を表示する');
    });

    it('ボタンをクリックすると actionClick が発火する', () => {
        fixture.componentRef.setInput('message', 'メッセージ');
        fixture.componentRef.setInput('actionLabel', '下り時刻表を表示する');
        fixture.detectChanges();

        let emitted = false;
        component.actionClick.subscribe(() => (emitted = true));

        const buttonEl = fixture.debugElement.query(By.css('button'));
        buttonEl.nativeElement.click();

        expect(emitted).toBe(true);
    });
});
