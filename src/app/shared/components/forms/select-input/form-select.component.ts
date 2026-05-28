import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

export interface FormSelectOption<T = string> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-form-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-select.component.html',
})
export class FormSelectComponent<T = string> {
  label = input.required<string>();
  control = input.required<FormControl>();

  options = input.required<FormSelectOption<T>[]>();

  helper = input<string | null>(null);
  error = input<string | null>(null);

  changed = output<Event>();
}