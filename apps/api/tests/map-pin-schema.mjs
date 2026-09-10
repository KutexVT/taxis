import assert from 'node:assert/strict';
import { createMapPinSchema } from '../../../packages/shared/dist/schemas.js';

assert.equal(createMapPinSchema.parse({ name: 'Base', color: '#22c55e', lat: 10, lng: -84 }).color, '#22c55e');
assert.equal(createMapPinSchema.safeParse({ name: 'Base', color: '#abcdef', lat: 10, lng: -84 }).success, false);
assert.equal(createMapPinSchema.safeParse({ name: '', color: '#ef4444', lat: 100, lng: 0 }).success, false);

console.log('map pin schema ok');
