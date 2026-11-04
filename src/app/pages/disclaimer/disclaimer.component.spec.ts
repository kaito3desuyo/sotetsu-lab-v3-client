import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageMeta } from 'src/app/core/ssr/page-meta';

import { DisclaimerComponent } from './disclaimer.component';

describe('DisclaimerComponent', () => {
    let component: DisclaimerComponent;
    let fixture: ComponentFixture<DisclaimerComponent>;
    const pageMeta = { set: jest.fn() };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DisclaimerComponent],
            providers: [{ provide: PageMeta, useValue: pageMeta }],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(DisclaimerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('題名・説明・URL を PageMeta に入れる', () => {
        expect(pageMeta.set).toHaveBeenCalledWith(
            expect.objectContaining({
                title: '免責事項',
                url: '/disclaimer',
                description: expect.any(String),
            }),
        );
    });
});
