import { metricTile } from '../components/metricTile.js';
import { pageHeader } from '../components/pageHeader.js';
import { sectionCard } from '../components/sectionCard.js';
import { statusChip } from '../components/statusChip.js';

const clamp = (value) => Math.max(0, Math.min(100, Number(value || 0)));

const healthDistribution = (signals = []) => {
  const counts = { green: 0, yellow: 0, red: 0 };
  (signals || []).forEach((signal) => {
    const health = String(signal.account?.health?.overall || '').toLowerCase();
    if (health === 'green') counts.green += 1;
    else if (health === 'yellow') counts.yellow += 1;
    else counts.red += 1;
  });
  return counts;
};

const adoptionDistribution = (signals = []) => {
  const bins = {
    low: 0,
    medium: 0,
    high: 0
  };
  (signals || []).forEach((signal) => {
    const score = Number(signal.account?.adoption?.platform_adoption_score || 0);
    if (score >= 75) bins.high += 1;
    else if (score >= 55) bins.medium += 1;
    else bins.low += 1;
  });
  return bins;
};

const barRow = (label, value, total, tone = 'neutral') => {
  const percent = total > 0 ? clamp((value / total) * 100) : 0;
  return `
    <div class="mix-row">
      <span>${label}</span>
      <div class="mix-bar"><i style="width:${percent}%;${tone === 'good' ? 'background:linear-gradient(90deg,#1AAA55,#1AAA55);' : tone === 'warn' ? 'background:linear-gradient(90deg,#FCA121,#FCA121);' : tone === 'risk' ? 'background:linear-gradient(90deg,#E24329,#E24329);' : ''}"></i></div>
      <strong>${value}</strong>
    </div>
  `;
};

export const renderManagerPage = (ctx) => {
  const { portfolio, navigate } = ctx;
  const signals = portfolio?.signals || [];
  const total = signals.length || 1;
  const health = healthDistribution(signals);
  const adoption = adoptionDistribution(signals);
  const renewal90 = signals.filter((signal) => Number(signal.renewalDays ?? 999) <= 90).length;
  const noEngagement30 = signals.filter((signal) => Number(signal.touchStaleDays ?? 999) > 30).length;
  const noUpcomingTouch = signals.filter((signal) => !signal.account?.engagement?.next_touch_date).length;
  const avgAdoption = signals.length
    ? Math.round(
        signals.reduce((sum, signal) => sum + Number(signal.account?.adoption?.platform_adoption_score || 0), 0) / signals.length
      )
    : 0;
  const topRisks = [...signals]
    .sort((left, right) => Number(right.outlierScore || 0) - Number(left.outlierScore || 0))
    .slice(0, 8);

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'manager');
  wrapper.innerHTML = `
    ${pageHeader({
      eyebrow: 'Manager',
      title: 'CSE Manager Dashboard',
      subtitle: 'Team-level portfolio oversight for health distribution, adoption coverage, renewal risk, and engagement gaps.',
      actionsHtml: '<button class="ghost-btn" type="button" data-go-portfolio>Back to Portfolio</button>'
    })}

    ${sectionCard({
      bodyHtml: `
      <div class="kpi-grid kpi-4">
        ${metricTile({ label: 'Total accounts', value: signals.length, tone: 'neutral' })}
        ${metricTile({ label: 'Average adoption', value: avgAdoption, tone: avgAdoption >= 70 ? 'good' : 'warn' })}
        ${metricTile({ label: 'Renewals < 90d', value: renewal90, tone: renewal90 > 0 ? 'warn' : 'good' })}
        ${metricTile({ label: 'No engagement > 30d', value: noEngagement30, tone: noEngagement30 > 0 ? 'risk' : 'good' })}
      </div>
      <div class="kpi-grid kpi-3" style="margin-top:16px;">
        ${metricTile({ label: 'Healthy', value: health.green, tone: 'good' })}
        ${metricTile({ label: 'Attention', value: health.yellow, tone: 'warn' })}
        ${metricTile({ label: 'Risk', value: health.red, tone: 'risk' })}
      </div>
      `
    })}

    <section class="dashboard-grid">
      <div class="main-col">
        ${sectionCard({
          title: 'Portfolio Health Distribution',
          chipHtml: statusChip({ label: `${signals.length} accounts`, tone: 'neutral' }),
          bodyHtml: `
            <div class="mix-chart">
              ${barRow('Healthy', health.green, total, 'good')}
              ${barRow('Attention', health.yellow, total, 'warn')}
              ${barRow('Risk', health.red, total, 'risk')}
            </div>
          `
        })}

        ${sectionCard({
          title: 'Use Case Adoption Distribution',
          chipHtml: statusChip({ label: 'Platform score bands', tone: 'neutral' }),
          bodyHtml: `
            <div class="mix-chart">
              ${barRow('High (75+)', adoption.high, total, 'good')}
              ${barRow('Medium (55-74)', adoption.medium, total, 'warn')}
              ${barRow('Low (<55)', adoption.low, total, 'risk')}
            </div>
          `
        })}
      </div>

      <div class="mid-col">
        ${sectionCard({
          title: 'Renewal Risk Map',
          chipHtml: statusChip({ label: `${renewal90} in 90d`, tone: renewal90 > 0 ? 'warn' : 'good' }),
          bodyHtml: `
            <ul class="simple-list">
              ${
                topRisks.length
                  ? topRisks
                      .map(
                        (signal) =>
                          `<li><a href="#" data-open-account="${signal.account.id}">${signal.account.name}</a> - renewal ${signal.renewalDays ?? 'n/a'}d - ${signal.reasons[0] || 'review required'}</li>`
                      )
                      .join('')
                  : '<li>No risk accounts detected.</li>'
              }
            </ul>
          `
        })}
      </div>

      <div class="right-col">
        ${sectionCard({
          title: 'Manager Actions',
          chipHtml: statusChip({ label: 'Coverage', tone: 'neutral' }),
          bodyHtml: `
            <ul class="drawer-list">
              <li>Assign immediate support to red health accounts.</li>
              <li>Review no-engagement accounts with no upcoming touch (${noUpcomingTouch}).</li>
              <li>Prioritize renewal accounts with adoption below 3 green use cases.</li>
            </ul>
          `
        })}
      </div>
    </section>
  `;

  wrapper.querySelector('[data-go-portfolio]')?.addEventListener('click', () => navigate('portfolio'));
  wrapper.addEventListener('click', (event) => {
    const link = event.target.closest('[data-open-account]');
    if (!link) return;
    event.preventDefault();
    navigate('account', { id: link.getAttribute('data-open-account') });
  });

  return wrapper;
};

export const managerCommandEntries = () => [
  { id: 'manager-open', label: 'Open Manager Dashboard', meta: 'Manager', action: { route: 'manager' } }
];
