import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-add-operation-sighting-form',
  templateUrl: './add-operation-sighting-form.component.html',
  styleUrls: ['./add-operation-sighting-form.component.css']
})
export class AddOperationSightingFormComponent implements OnInit {
  sendDataSet = this.fb.group({
    vehicleNumber: [''],
    operationNumber: ['']
  });

  constructor(private fb: FormBuilder) {}

  ngOnInit() {}
}
