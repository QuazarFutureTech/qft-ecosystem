import React from 'react';
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import Table from '../Table';
import axe from 'axe-core';

const cols = [{ key: 'id', title: 'ID' }, { key: 'name', title: 'Name' }];
const rows = [{ id: '1', name: 'One' }, { id: '2', name: 'Two' }];

test('renders Table and is accessible', async () => {
  const { container } = render(<Table cols={cols} rows={rows} caption="Test table" />);
  expect(screen.getByRole('table')).not.toBeNull();
  const results = await axe.run(container);
  expect(results.violations.length).toBe(0);
});
