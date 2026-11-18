'use strict';
/* HRP FY27 V2MOM measures owned by Amit Kumar (GCP method excluded), seeded once into the shared project catalog so every team lists them.
 * Method = the V2MOM refs from the FY27 HRP V2MOM Review sheet, " | " separated; "NO V2MOM Reference" when the sheet has none.
 * Bump SEED_VERSION to add new seeds; existing catalog entries are never overwritten and a team's removals stay per team. */
const SEED_VERSION = 1;
const SEED_PROJECTS = [
  {
    "id": "hrp-m1-1-1",
    "short": "HRP M1.1.1",
    "name": "HRP M1.1.1 - HRP meets all defined goals on the E360 dashboard",
    "method": "HPS M2.1.1 | HPS M2.1.2 | HPS M2.3.1"
  },
  {
    "id": "hrp-m1-1-3",
    "short": "HRP M1.1.3",
    "name": "HRP M1.1.3 - Availability: no Sev0s, Tier 0/1 meet SLO",
    "method": "HPS M2.2.1 | HPS M2.2.2 | HPS M2.2.3"
  },
  {
    "id": "hrp-m1-2-1",
    "short": "HRP M1.2.1",
    "name": "HRP M1.2.1 - Deliver OOB cluster redundancy and cellularization",
    "method": "Meir M5.3.5 | HPS M7.1.1 | T&P 1.21"
  },
  {
    "id": "hrp-m1-2-1-2",
    "short": "HRP M1.2.1.2",
    "name": "HRP M1.2.1.2 - Supercell deployments for Core, MQ, VegaCache, IG",
    "method": "Meir M5.1.2 | HPS M9.3.3"
  },
  {
    "id": "hrp-m1-2-2-5",
    "short": "HRP M1.2.2.5",
    "name": "HRP M1.2.2.5 - MQ platform safety: SDB Memstore/DB CPU abuse",
    "method": "NO V2MOM Reference"
  },
  {
    "id": "hrp-m1-2-4",
    "short": "HRP M1.2.4",
    "name": "HRP M1.2.4 - Resilience to AZ failure (static stability)",
    "method": "Meir M5.1.10 | HPS M3.1.1"
  },
  {
    "id": "hrp-m1-2-5",
    "short": "HRP M1.2.5",
    "name": "HRP M1.2.5 - VegaCache, MQ and Cron support ACRC for DR",
    "method": "T&P 1.32 | Meir M6.2 | HPS M8.1.6"
  },
  {
    "id": "hrp-m1-3-1",
    "short": "HRP M1.3.1",
    "name": "HRP M1.3.1 - Detect Sev 0/1 within 10 min (TTD), cut P75 TTR 50%",
    "method": "Meir M5.1.1"
  },
  {
    "id": "hrp-m1-4-1",
    "short": "HRP M1.4.1",
    "name": "HRP M1.4.1 - Open source software at n-1 minor versions",
    "method": "NO V2MOM Reference"
  },
  {
    "id": "hrp-m1-5-2",
    "short": "HRP M1.5.2",
    "name": "HRP M1.5.2 - Scale MQ for Agentforce, Data Cloud and Apex surge",
    "method": "HPS M9.3.6"
  },
  {
    "id": "hrp-m1-5-3",
    "short": "HRP M1.5.3",
    "name": "HRP M1.5.3 - VegaCache scaling for Bajaj Diwali 2026",
    "method": "HPS M9.4.5"
  },
  {
    "id": "hrp-m1-5-4",
    "short": "HRP M1.5.4",
    "name": "HRP M1.5.4 - Scale MQ for Agentforce and Data Cloud",
    "method": "NO V2MOM Reference"
  },
  {
    "id": "hrp-m1-5-5",
    "short": "HRP M1.5.5",
    "name": "HRP M1.5.5 - Eliminate improper VegaCache access patterns in CoreApp",
    "method": "Meir M5.1.2"
  },
  {
    "id": "hrp-m2-2-1",
    "short": "HRP M2.2.1",
    "name": "HRP M2.2.1 - Measure and decrease time spent on PD alerts",
    "method": "NO V2MOM Reference"
  },
  {
    "id": "hrp-m2-3-2-1",
    "short": "HRP M2.3.2.1",
    "name": "HRP M2.3.2.1 - All services release every sprint, no manual steps",
    "method": "Meir M4.2.1"
  },
  {
    "id": "hrp-m2-6-1",
    "short": "HRP M2.6.1",
    "name": "HRP M2.6.1 - Reduce burnout and bureaucracy (GIS survey)",
    "method": "NO V2MOM Reference"
  },
  {
    "id": "hrp-m4-1-1",
    "short": "HRP M4.1.1",
    "name": "HRP M4.1.1 - L5 managers over $1M spend keep COIN score >=85",
    "method": "Meir M9.2.4 | HPS M11.3.3.1"
  },
  {
    "id": "hrp-m4-2-4",
    "short": "HRP M4.2.4",
    "name": "HRP M4.2.4 - Capture 37% of $280k/week low p99 CPU savings",
    "method": "Meir M9.2.16 | HPS M11.3.3.5"
  },
  {
    "id": "hrp-m5-0-1",
    "short": "HRP M5.0.1",
    "name": "HRP M5.0.1 - All CFS Services reach feature and adoption parity",
    "method": "NO V2MOM Reference"
  },
  {
    "id": "hrp-m5-4-2",
    "short": "HRP M5.4.2",
    "name": "HRP M5.4.2 - Establish CSAT baseline, raise it by 10%",
    "method": "NO V2MOM Reference"
  },
  {
    "id": "hrp-m5-5-1",
    "short": "HRP M5.5.1",
    "name": "HRP M5.5.1 - 100% VegaCache adoption in GCP, over 50% in AWS",
    "method": "HPS M6.2.2"
  },
  {
    "id": "hrp-m5-5-2",
    "short": "HRP M5.5.2",
    "name": "HRP M5.5.2 - MAPS as the queueing and async execution platform",
    "method": "HPS M6.2.2"
  },
  {
    "id": "hrp-m5-5-3",
    "short": "HRP M5.5.3",
    "name": "HRP M5.5.3 - VegaStore: durable KV store in VegaCache",
    "method": "NO V2MOM Reference"
  },
  {
    "id": "hrp-m5-6-1",
    "short": "HRP M5.6.1",
    "name": "HRP M5.6.1 - Serverless in GCP by Q2, AWS pilots with MAPS by Q3",
    "method": "NO V2MOM Reference"
  }
];
module.exports = { SEED_VERSION, SEED_PROJECTS };
