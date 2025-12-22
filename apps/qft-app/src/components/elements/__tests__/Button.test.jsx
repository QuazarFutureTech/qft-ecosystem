import React from 'react';
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import Button from '../Button';
import axe from 'axe-core';

test('renders Button and has no basic accessibility violations', async () => {
  const { container } = render(<Button>Click me</Button>);
  expect(screen.getByText(/Click me/i)).not.toBeNull();
  const results = await axe.run(container);
  expect(results.violations.length).toBe(0);
});
