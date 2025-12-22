import React from 'react';
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import Switch from '../Switch';
import axe from 'axe-core';

test('renders Switch and is accessible', async () => {
  const { container } = render(<Switch checked={false} onChange={() => {}} ariaLabel="test switch" />);
  expect(screen.getByRole('checkbox', { name: /test switch/i })).not.toBeNull();
  const results = await axe.run(container);
  expect(results.violations.length).toBe(0);
});
