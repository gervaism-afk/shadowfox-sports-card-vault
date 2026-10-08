import {test} from 'node:test';
import assert from 'node:assert/strict';
import {identificationProviderFailure} from '../lib/identification-errors';
test('provider outages distinguish account credit, credential, busy and configuration failures from card recognition',()=>{
 assert.equal(identificationProviderFailure(402).code,'AI_CREDITS_EXHAUSTED');
 assert.equal(identificationProviderFailure(401).code,'AI_PROVIDER_AUTH');
 assert.equal(identificationProviderFailure(429).code,'AI_RATE_LIMIT');
 assert.equal(identificationProviderFailure(400).code,'AI_MODEL_CONFIGURATION');
 assert.equal(identificationProviderFailure(503).code,'AI_PROVIDER_UNAVAILABLE');
 for(const status of [400,401,402,429,503])assert.ok(!identificationProviderFailure(status).error.includes('clearer photo'));
});
