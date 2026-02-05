#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const registryPath = path.join(process.cwd(), 'data', 'resources.json');

if (!fs.existsSync(registryPath)) {
  console.error('resources.json not found at', registryPath);
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const links = [...new Set((registry.resources || []).map((resource) => resource.link).filter(Boolean))];

if (!links.length) {
  console.error('No links found in resources.json');
  process.exit(1);
}

const HEADERS = {
  'user-agent': 'GitLAB-Health-link-verifier/1.0'
};

const stripFragment = (url) => {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString();
  } catch (error) {
    return url;
  }
};

const checkLink = async (url) => {
  const requestUrl = stripFragment(url);
  let response;
  try {
    response = await fetch(requestUrl, { method: 'HEAD', redirect: 'follow', headers: HEADERS });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(requestUrl, { method: 'GET', redirect: 'follow', headers: HEADERS });
    }
  } catch (error) {
    return { ok: false, status: 'ERR', url, message: error.message };
  }

  const ok = response.status >= 200 && response.status < 400;
  return {
    ok,
    status: response.status,
    url,
    message: ok ? 'OK' : `HTTP ${response.status}`
  };
};

(async () => {
  console.log(`Verifying ${links.length} resource links...`);
  const results = [];

  for (const link of links) {
    // Keep sequence deterministic and gentle on handbook/docs hosts.
    // eslint-disable-next-line no-await-in-loop
    const result = await checkLink(link);
    results.push(result);
    const marker = result.ok ? 'PASS' : 'FAIL';
    console.log(`[${marker}] ${result.status} ${result.url}`);
  }

  const failures = results.filter((result) => !result.ok);
  if (failures.length) {
    console.error(`\n${failures.length} link(s) failed verification:`);
    failures.forEach((failure) => {
      console.error(`- ${failure.url} (${failure.message})`);
    });
    process.exit(1);
  }

  console.log('\nAll resource links returned a non-error status.');
})();
