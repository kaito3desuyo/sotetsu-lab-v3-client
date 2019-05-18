import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.scss']
})
export class LoadingComponent implements OnInit {
  constructor(private cd: ChangeDetectorRef) {}

  ngOnInit() {}
}
