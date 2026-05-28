import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-textarea',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-textarea.component.html',
})
export class FormTextareaComponent {
  label = input.required<string>();
  control = input.required<FormControl>();

  placeholder = input<string>('');
  rows = input<number>(3);
  helper = input<string | null>(null);
  error = input<string | null>(null);
}