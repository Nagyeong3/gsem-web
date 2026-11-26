import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { parse } from 'yaml';
const implementedApiPaths = [
  '/dashboard/overview',
  '/items/filter-options',
  '/items',
  '/items/{itemId}',
  '/items/{itemId}/replacement-graph',
  '/deliveries',
  '/change-events',
];

const source = await readFile(new URL('../docs/api/openapi.yaml', import.meta.url), 'utf8');
const document = parse(source);

function collectLocalReferences(value, references = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectLocalReferences(item, references));
    return references;
  }
  if (!value || typeof value !== 'object') return references;
  if (typeof value.$ref === 'string' && value.$ref.startsWith('#/')) {
    references.push(value.$ref);
  }
  Object.values(value).forEach((item) => collectLocalReferences(item, references));
  return references;
}

function resolveReference(reference) {
  return reference
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((current, part) => current?.[part], document);
}

test('OpenAPI 문서가 YAML로 파싱되고 핵심 Endpoint를 포함한다', () => {
  assert.equal(document.openapi, '3.1.0');
  for (const path of [
    '/dashboard/overview',
    '/items',
    '/items/{itemId}',
    '/items/{itemId}/replacement-graph',
    '/deliveries',
    '/change-events',
  ]) {
    assert.ok(document.paths[path], `${path} Endpoint가 없습니다.`);
  }
});

test('OpenAPI 내부 참조가 모두 실제 대상을 가리킨다', () => {
  const references = collectLocalReferences(document);
  assert.ok(references.length > 0);
  for (const reference of references) {
    assert.notEqual(resolveReference(reference), undefined, `${reference} 참조를 찾을 수 없습니다.`);
  }
});

test('OpenAPI 경로와 실제 백엔드 조회 Endpoint가 일치한다', () => {
  assert.deepEqual(Object.keys(document.paths).sort(), [...implementedApiPaths].sort());
  for (const path of implementedApiPaths) {
    assert.ok(document.paths[path].get, `${path}의 GET 계약이 없습니다.`);
  }
});
