// Run locally, never in the browser. Authenticate through Google Cloud first.
import { getReportingToken } from './analytics-auth.mjs';
const property = process.env.GA4_PROPERTY_ID || '566066828';
if (!/^\d+$/.test(property)) {
  console.error('GA4_PROPERTY_ID must be a numeric property ID.');
  process.exit(1);
}
let token;
try {
  token = await getReportingToken();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const response = await fetch(
  `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionSourceMedium' }, { name: 'landingPage' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'totalUsers' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 100,
    }),
  },
);
if (!response.ok) {
  console.error(
    `Analytics API failed (${response.status}). Check API enablement, token scope and property access.`,
  );
  process.exit(1);
}
console.log(JSON.stringify(await response.json(), null, 2));
