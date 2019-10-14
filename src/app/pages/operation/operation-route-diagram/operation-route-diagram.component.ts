import { Component, OnInit, Inject, Injector } from '@angular/core';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { ActivatedRoute } from '@angular/router';
import { TitleService } from 'src/app/general/services/title.service';

@Component({
  selector: 'app-operation-route-diagram',
  templateUrl: './operation-route-diagram.component.html',
  styleUrls: ['./operation-route-diagram.component.scss']
})
export class OperationRouteDiagramComponent extends BaseComponent {
  constructor(
    @Inject(Injector) injector: Injector,
    private route: ActivatedRoute,
    private titleService: TitleService
  ) {
    super(injector);
    this.subscription = this.route.data.subscribe((data: { title: string }) => {
      this.titleService.setTitle(data.title);
    });
  }
}
