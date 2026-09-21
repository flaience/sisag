import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { it } from 'node:test';
const read = p => readFileSync(new URL('../../'+p, import.meta.url),'utf8').replace(/\r\n/g,'\n');
const worker = read('.github/workflows/deploy-outbox-dispatcher.yml');
const app = read('.github/workflows/deploy.yml');
it('shares a non-cancelling concurrency group', () => {
  for (const s of [worker,app]) assert.ok(s.includes('concurrency:\n  group: sisag-production-release\n  cancel-in-progress: false'));
});
it('gates the only dispatcher SSH deployment on manual main and both confirmations', () => {
  assert.equal((worker.match(/uses: appleboy\/ssh-action/g)||[]).length,1);
  assert.ok(worker.includes("      - name: Deploy dispatcher to Swarm via SSH\n        if: ${{ github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main' && inputs.confirm_app_ready == true && inputs.confirm_queue_safe == true }}"));
  assert.equal((worker.match(/default: false/g)||[]).length,2);
});
it('checks app task images before the only service update', () => {
  assert.equal((worker.match(/docker service update/g)||[]).length,1);
  assert.ok(worker.indexOf('TASK_IMAGE=') < worker.indexOf('docker service update'));
  assert.ok(worker.includes('[ "$APP_RUNNING" = "$APP_EXPECTED" ]'));
  assert.ok(worker.includes('[ "$APP_UPDATE" = "completed" ]'));
});

// Local evaluation of the workflow's restricted boolean expression, NOT the Actions engine.
// These cases use typed booleans as declared by workflow_dispatch.
const jobExpression = worker.match(/  build-push-deploy:\n    if: \$\{\{ (.+) \}\}/)?.[1];
const expectedExpression = "github.ref == 'refs/heads/main' && (github.event_name == 'push' || (github.event_name == 'workflow_dispatch' && inputs.confirm_app_ready == true && inputs.confirm_queue_safe == true))";
it('places the publication gate on the entire job', () => {
  assert.equal(jobExpression, expectedExpression);
});
const publicationCases = [
  ['push main', 'push', 'refs/heads/main', false, false, true],
  ['push branch', 'push', 'refs/heads/audit/test', true, true, false],
  ['manual main unconfirmed', 'workflow_dispatch', 'refs/heads/main', false, false, false],
  ['manual missing queue confirmation', 'workflow_dispatch', 'refs/heads/main', true, false, false],
  ['manual missing app confirmation', 'workflow_dispatch', 'refs/heads/main', false, true, false],
  ['manual branch confirmed', 'workflow_dispatch', 'refs/heads/audit/test', true, true, false],
  ['manual main confirmed', 'workflow_dispatch', 'refs/heads/main', true, true, true],
  ['other event', 'pull_request', 'refs/heads/main', true, true, false],
];
for (const [name,event,ref,appReady,queueSafe,expected] of publicationCases) {
  it('local publication decision: '+name, () => {
    assert.equal(jobExpression, expectedExpression); // Never evaluate arbitrary workflow content.
    const evaluate = new Function('github','inputs','return ('+jobExpression+');');
    assert.equal(evaluate({event_name:event,ref}, {confirm_app_ready:appReady,confirm_queue_safe:queueSafe}),expected);
  });
}
