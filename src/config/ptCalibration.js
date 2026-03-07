const toNumber = (value, fallback) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toInt = (value, fallback) => Math.round(toNumber(value, fallback));

const normalizeBuckets = (value, fallback) => {
  if (!Array.isArray(value) || !value.length) return fallback.map((item) => ({ ...item }));
  const normalized = value
    .map((item) => ({
      maxDays: toInt(item?.maxDays, Number.POSITIVE_INFINITY),
      score: toInt(item?.score, 0)
    }))
    .filter((item) => Number.isFinite(item.maxDays) || item.maxDays === Number.POSITIVE_INFINITY)
    .sort((left, right) => left.maxDays - right.maxDays);
  return normalized.length ? normalized : fallback.map((item) => ({ ...item }));
};

export const DEFAULT_PT_CALIBRATION = Object.freeze({
  profileId: 'pt_proxy_v1',
  profileVersion: '1.0.0',
  provenance:
    'Local deterministic proxy model in this static console. Concepts align to GitLab handbook metrics, but coefficients are not official GitLab production model weights.',
  banding: {
    high: 70,
    medium: 45
  },
  renewalPressure: {
    unknownScore: 20,
    buckets: [
      { maxDays: 30, score: 100 },
      { maxDays: 60, score: 80 },
      { maxDays: 90, score: 60 },
      { maxDays: 180, score: 35 },
      { maxDays: Number.POSITIVE_INFINITY, score: 15 }
    ]
  },
  pte: {
    weights: {
      adoption: 0.32,
      engagement: 0.23,
      riskStability: 0.15,
      cicd: 0.13,
      security: 0.08,
      stageCoverage: 0.09
    },
    adjustments: {
      renewalNearWindowDays: 120,
      renewalNearBonus: 8,
      renewalMidWindowDays: 180,
      renewalMidBonus: 4,
      renewalDistantDays: 365,
      renewalDistantPenalty: -4,
      openExpansionPerOpportunity: 2,
      openExpansionCap: 8,
      lowEngagementThreshold: 45,
      lowEngagementPenalty: -10,
      highRiskThreshold: 70,
      highRiskPenalty: -12
    }
  },
  ptc: {
    weights: {
      risk: 0.42,
      adoptionGap: 0.24,
      engagementGap: 0.17,
      renewalPressure: 0.17
    },
    adjustments: {
      renewalSoonSignal: 8,
      staleEngagementDays: 90,
      staleEngagementPenalty: 10,
      lowSecurityThreshold: 30,
      lowSecurityPenalty: 5,
      strongMomentumAdoption: 70,
      strongMomentumEngagement: 70,
      strongMomentumRiskMax: 35,
      strongMomentumCredit: -12
    }
  }
});

export const ensurePtCalibration = (value) => {
  const base = value && typeof value === 'object' ? value : {};
  const defaults = DEFAULT_PT_CALIBRATION;

  return {
    profileId: String(base.profileId || defaults.profileId),
    profileVersion: String(base.profileVersion || defaults.profileVersion),
    provenance: String(base.provenance || defaults.provenance),
    banding: {
      high: toInt(base?.banding?.high, defaults.banding.high),
      medium: toInt(base?.banding?.medium, defaults.banding.medium)
    },
    renewalPressure: {
      unknownScore: toInt(base?.renewalPressure?.unknownScore, defaults.renewalPressure.unknownScore),
      buckets: normalizeBuckets(base?.renewalPressure?.buckets, defaults.renewalPressure.buckets)
    },
    pte: {
      weights: {
        adoption: toNumber(base?.pte?.weights?.adoption, defaults.pte.weights.adoption),
        engagement: toNumber(base?.pte?.weights?.engagement, defaults.pte.weights.engagement),
        riskStability: toNumber(base?.pte?.weights?.riskStability, defaults.pte.weights.riskStability),
        cicd: toNumber(base?.pte?.weights?.cicd, defaults.pte.weights.cicd),
        security: toNumber(base?.pte?.weights?.security, defaults.pte.weights.security),
        stageCoverage: toNumber(base?.pte?.weights?.stageCoverage, defaults.pte.weights.stageCoverage)
      },
      adjustments: {
        renewalNearWindowDays: toInt(base?.pte?.adjustments?.renewalNearWindowDays, defaults.pte.adjustments.renewalNearWindowDays),
        renewalNearBonus: toInt(base?.pte?.adjustments?.renewalNearBonus, defaults.pte.adjustments.renewalNearBonus),
        renewalMidWindowDays: toInt(base?.pte?.adjustments?.renewalMidWindowDays, defaults.pte.adjustments.renewalMidWindowDays),
        renewalMidBonus: toInt(base?.pte?.adjustments?.renewalMidBonus, defaults.pte.adjustments.renewalMidBonus),
        renewalDistantDays: toInt(base?.pte?.adjustments?.renewalDistantDays, defaults.pte.adjustments.renewalDistantDays),
        renewalDistantPenalty: toInt(base?.pte?.adjustments?.renewalDistantPenalty, defaults.pte.adjustments.renewalDistantPenalty),
        openExpansionPerOpportunity: toNumber(
          base?.pte?.adjustments?.openExpansionPerOpportunity,
          defaults.pte.adjustments.openExpansionPerOpportunity
        ),
        openExpansionCap: toInt(base?.pte?.adjustments?.openExpansionCap, defaults.pte.adjustments.openExpansionCap),
        lowEngagementThreshold: toInt(base?.pte?.adjustments?.lowEngagementThreshold, defaults.pte.adjustments.lowEngagementThreshold),
        lowEngagementPenalty: toInt(base?.pte?.adjustments?.lowEngagementPenalty, defaults.pte.adjustments.lowEngagementPenalty),
        highRiskThreshold: toInt(base?.pte?.adjustments?.highRiskThreshold, defaults.pte.adjustments.highRiskThreshold),
        highRiskPenalty: toInt(base?.pte?.adjustments?.highRiskPenalty, defaults.pte.adjustments.highRiskPenalty)
      }
    },
    ptc: {
      weights: {
        risk: toNumber(base?.ptc?.weights?.risk, defaults.ptc.weights.risk),
        adoptionGap: toNumber(base?.ptc?.weights?.adoptionGap, defaults.ptc.weights.adoptionGap),
        engagementGap: toNumber(base?.ptc?.weights?.engagementGap, defaults.ptc.weights.engagementGap),
        renewalPressure: toNumber(base?.ptc?.weights?.renewalPressure, defaults.ptc.weights.renewalPressure)
      },
      adjustments: {
        renewalSoonSignal: toInt(base?.ptc?.adjustments?.renewalSoonSignal, defaults.ptc.adjustments.renewalSoonSignal),
        staleEngagementDays: toInt(base?.ptc?.adjustments?.staleEngagementDays, defaults.ptc.adjustments.staleEngagementDays),
        staleEngagementPenalty: toInt(base?.ptc?.adjustments?.staleEngagementPenalty, defaults.ptc.adjustments.staleEngagementPenalty),
        lowSecurityThreshold: toInt(base?.ptc?.adjustments?.lowSecurityThreshold, defaults.ptc.adjustments.lowSecurityThreshold),
        lowSecurityPenalty: toInt(base?.ptc?.adjustments?.lowSecurityPenalty, defaults.ptc.adjustments.lowSecurityPenalty),
        strongMomentumAdoption: toInt(base?.ptc?.adjustments?.strongMomentumAdoption, defaults.ptc.adjustments.strongMomentumAdoption),
        strongMomentumEngagement: toInt(
          base?.ptc?.adjustments?.strongMomentumEngagement,
          defaults.ptc.adjustments.strongMomentumEngagement
        ),
        strongMomentumRiskMax: toInt(base?.ptc?.adjustments?.strongMomentumRiskMax, defaults.ptc.adjustments.strongMomentumRiskMax),
        strongMomentumCredit: toInt(base?.ptc?.adjustments?.strongMomentumCredit, defaults.ptc.adjustments.strongMomentumCredit)
      }
    }
  };
};
