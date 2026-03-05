import { ADOPTION_PLAYBOOK_MAP } from '../../config/adoptionPlaybookMap.js';
import { MATURITY_LEVELS, USE_CASES } from '../../data/adoptionStages.js';
import { normalizeEngagementType, ENGAGEMENT_TYPES } from '../../config/engagementTypes.js';
import { statusChip } from '../statusChip.js';

const defaultProfile = {
  SCM: 'NOT_STARTED',
  CI: 'NOT_STARTED',
  CD: 'NOT_STARTED',
  DevSecOps: 'NOT_STARTED',
  'Agile Planning': 'NOT_STARTED'
};

const normalizeMaturity = (value) => {
  const key = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  return MATURITY_LEVELS[key] ? key : 'NOT_STARTED';
};

const rowColor = (maturity) => MATURITY_LEVELS[normalizeMaturity(maturity)]?.color || '#6b7280';
const scoreFor = (maturity) => MATURITY_LEVELS[normalizeMaturity(maturity)]?.score || 0;
const labelFor = (maturity) => MATURITY_LEVELS[normalizeMaturity(maturity)]?.label || 'Not Started';

const recommendationFor = (useCase, maturity) =>
  ADOPTION_PLAYBOOK_MAP?.[useCase]?.[normalizeMaturity(maturity)] || {
    playbookTitle: 'Adoption Playbook Review',
    engagementType: 'ON_DEMAND',
    handbookUrl: 'https://handbook.gitlab.com/handbook/customer-success/csm/stage-adoption/'
  };

export const compactAdoptionDots = (adoptionProfile = {}) =>
  USE_CASES.map((useCase) => {
    const maturity = normalizeMaturity(adoptionProfile?.[useCase] || defaultProfile[useCase]);
    const details = MATURITY_LEVELS[maturity];
    return `<span class="adoption-dot" style="background:${details.color}" title="${useCase}: ${details.label}" aria-label="${useCase}: ${details.label}"></span>`;
  }).join('');

export const createAdoptionStageWidget = ({
  accountId,
  adoptionProfile = defaultProfile,
  customerSafe = false,
  onScheduleEngagement,
  showTrend = false,
  trendPoints = []
}) => {
  const widget = document.createElement('section');
  widget.className = 'adoption-stage-widget card';

  const profile = { ...defaultProfile, ...(adoptionProfile || {}) };
  let expandedUseCase = null;

  const renderTrend = () => {
    if (!showTrend) return '';
    const points = Array.isArray(trendPoints) ? trendPoints : [];
    if (!points.length) return '<p class="muted">No adoption trend points available.</p>';
    const max = Math.max(1, ...points.map((item) => Number(item.value || 0)));
    const width = 360;
    const height = 96;
    const pad = 12;
    const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
    const polyline = points
      .map((point, index) => {
        const x = pad + index * step;
        const y = height - pad - (Number(point.value || 0) / max) * (height - pad * 2);
        return `${x},${y}`;
      })
      .join(' ');
    return `
      <div class="adoption-trend">
        <h4>90-day adoption trend</h4>
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="90-day adoption trend">
          <polyline fill="none" stroke="#0284c7" stroke-width="3" points="${polyline}"></polyline>
        </svg>
      </div>
    `;
  };

  const render = () => {
    widget.innerHTML = `
      <div class="metric-head">
        <h3>${customerSafe ? 'Adoption Focus Areas' : 'Use Case Adoption Stages'}</h3>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Use Case</th>
              <th>Stage</th>
              ${customerSafe ? '' : '<th>Maturity</th>'}
            </tr>
          </thead>
          <tbody>
            ${USE_CASES.map((useCase) => {
              const maturity = normalizeMaturity(profile[useCase]);
              return `
                <tr data-adoption-row="${useCase}" style="border-left:4px solid ${rowColor(maturity)};">
                  <td><button type="button" class="inline-link" data-open-usecase="${useCase}">${useCase}</button></td>
                  <td>${labelFor(maturity)}</td>
                  ${customerSafe ? '' : `<td>${scoreFor(maturity)}%</td>`}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${expandedUseCase ? '<div class="adoption-recommendation" data-adoption-rec></div>' : ''}
      ${renderTrend()}
    `;

    if (expandedUseCase) {
      const maturity = normalizeMaturity(profile[expandedUseCase]);
      const rec = recommendationFor(expandedUseCase, maturity);
      const type = normalizeEngagementType(rec.engagementType);
      const typeMeta = ENGAGEMENT_TYPES[type];
      const target = widget.querySelector('[data-adoption-rec]');
      if (target) {
        target.innerHTML = `
          <h4>${expandedUseCase} next action</h4>
          <p><strong>Recommended playbook:</strong> ${rec.playbookTitle}</p>
          <p><strong>Recommended engagement type:</strong> ${statusChip({ label: typeMeta.label, tone: 'neutral' })}</p>
          <p><a href="${rec.handbookUrl}" target="_blank" rel="noopener noreferrer">Open handbook guidance</a></p>
          <div class="page-actions">
            <button class="ghost-btn" type="button" data-schedule-engagement>Schedule Engagement</button>
          </div>
        `;
        target.querySelector('[data-schedule-engagement]')?.addEventListener('click', () => {
          onScheduleEngagement?.({ accountId, useCase: expandedUseCase, maturity, recommendation: rec });
        });
      }
    }

    widget.querySelectorAll('[data-open-usecase]').forEach((button) => {
      button.addEventListener('click', () => {
        expandedUseCase = button.getAttribute('data-open-usecase');
        render();
      });
    });
  };

  render();
  return widget;
};
