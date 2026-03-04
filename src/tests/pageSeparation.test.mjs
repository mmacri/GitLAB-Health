import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/portfolioPage.js', 'utf8');

test('today and portfolio render in separate page components', () => {
  const todayBlock = source
    .split('export const renderPortfolioHomePage = (ctx) => {')[1]
    .split('export const renderPortfolioPage = (ctx) => {')[0];
  const portfolioBlock = source
    .split('export const renderPortfolioPage = (ctx) => {')[1]
    .split('export const portfolioCommandEntries = (data) => {')[0];

  assert.match(todayBlock, /setAttribute\('data-page', 'today'\)/);
  assert.match(portfolioBlock, /setAttribute\('data-page', 'portfolio'\)/);
  assert.ok(!todayBlock.includes('Portfolio View'), 'Today page should not render portfolio heading');
  assert.ok(!portfolioBlock.includes('Today Console'), 'Portfolio page should not render today heading');
});
