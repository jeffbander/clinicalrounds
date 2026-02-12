'use client';

import { Analytics } from '@vercel/analytics/react';

export function AnalyticsProvider() {
  return (
    <Analytics
      beforeSend={(event) => {
        // Strip any potential PHI from URLs (UUIDs, query params, hash fragments)
        const url = new URL(event.url);
        url.search = '';
        url.hash = '';
        url.pathname = url.pathname.replace(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
          '[redacted]'
        );
        return { ...event, url: url.toString() };
      }}
    />
  );
}
