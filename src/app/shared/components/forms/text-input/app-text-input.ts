import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-input.component.html',
})
export class FormInputComponent {
  label = input.required<string>();
  control = input.required<FormControl>();

  type = input<string>('text');
  placeholder = input<string>('');
  helper = input<string | null>(null);
  error = input<string | null>(null);

  inputChanged = output<Event>();
}