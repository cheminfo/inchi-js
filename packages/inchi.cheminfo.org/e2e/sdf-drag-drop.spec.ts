import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

const sdf = readFileSync(
  join(import.meta.dirname, 'fixtures', 'molecules.sdf'),
  'utf8',
);

test('drag-and-dropping an SDF file parses every structure', async ({
  page,
}) => {
  await page.goto('/#/sdf');

  const dropzone = page.getByTestId('sdf-dropzone');
  await expect(dropzone).toBeVisible();
  // The empty state offers a click-to-browse button.
  await expect(
    dropzone.getByRole('button', { name: 'Select file…' }),
  ).toBeVisible();

  // Simulate a real OS file drop onto the react-science DropZone. A single
  // `drop` event with a populated DataTransfer is what react-dropzone reacts
  // to; doing it in-page avoids the drag overlay detaching the locator.
  await dropzone.evaluate((root, content) => {
    const input = root.querySelector('input[type="file"]');
    if (!input?.parentElement) throw new Error('drop zone input not found');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([content], 'molecules.sdf', { type: '' }));
    const event = new DragEvent('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
    input.parentElement.dispatchEvent(event);
  }, sdf);

  // The two structures from the fixture are parsed: the run button shows the
  // exact count and the drop zone switches to its loaded summary.
  await expect(
    page.getByRole('button', { name: 'Generate InChI (2)' }),
  ).toBeVisible();
  await expect(
    dropzone.getByText('molecules.sdf', { exact: true }),
  ).toBeVisible();

  // Once a file is loaded, the redundant empty-state button is gone.
  await expect(
    dropzone.getByRole('button', { name: 'Select file…' }),
  ).toHaveCount(0);

  // Every parsed structure gets one row in the table.
  await expect(page.locator('.molecule-table-row')).toHaveCount(2);
  await expect(page.getByText('methane', { exact: true })).toBeVisible();
  await expect(page.getByText('water', { exact: true })).toBeVisible();
});
