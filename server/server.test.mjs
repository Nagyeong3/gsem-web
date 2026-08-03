import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InMemoryGsemRepository } from './repositories/InMemoryGsemRepository.mjs';
import { MsAccessGsemRepository } from './repositories/MsAccessGsemRepository.mjs';
import { GsemService } from './services/GsemService.mjs';

test('서비스가 저장소 구현에 의존하지 않고 조회 계약을 사용한다', () => {
  const calls = [];
  const repository = {
    getDashboardOverview() {
      calls.push('dashboard');
      return { metrics: [] };
    },
  };
  const service = new GsemService(repository);
  assert.deepEqual(service.getDashboardOverview(), { metrics: [] });
  assert.deepEqual(calls, ['dashboard']);
});

test('인메모리 저장소는 복수 사업 품목과 대체 그래프를 보존한다', () => {
  const repository = new InMemoryGsemRepository();
  assert.equal(repository.getItems().length, 12);
  assert.equal(repository.getItemById(1).businesses.length, 2);
  assert.equal(repository.getReplacementGraph(1).nodes.length, 12);
  assert.equal(repository.getReplacementGraph(999), null);
});

test('MS Access 어댑터는 실제 연결 전 잘못 사용되지 않도록 차단한다', () => {
  assert.throws(() => new MsAccessGsemRepository(), /아직 구성되지 않았습니다/);
});
