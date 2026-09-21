import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { it } from 'node:test';

const workflow = readFileSync(new URL('../../.github/workflows/deploy-outbox-dispatcher.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const start = '            # Read-only preflight before touching the dispatcher.\n';
const end = '            # Queue safety is an operator attestation, NOT an automated drain.';
assert.equal(workflow.split(start).length, 2);
assert.equal(workflow.split(end).length, 2);
const preflight = workflow.split(start)[1].split(end)[0]
  .replace(/^ {12}/gm, '')
  .replaceAll('${{ env.OWNER_LC }}', 'fixture-owner')
  .replaceAll('${{ github.sha }}', 'fixture-sha');
assert.ok(!preflight.includes('${{'));
assert.ok(!preflight.includes('docker service update'));
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash';
assert.ok(existsSync(bash), 'Bash necessário: Git for Windows ou /bin/bash. Nenhum teste ignorado.');

// This function substitutes Docker entirely. No Docker CLI, SSH, network or service update.
const fakeDocker = String.raw`
docker() {
  if [ "$1" = service ] && [ "$2" = inspect ]; then
    if [ "$SCENARIO" = inspect_failure ]; then return 71; fi
    case "$5" in
      '{{.Spec.TaskTemplate.ContainerSpec.Image}}')
        if [ "$SCENARIO" = old_service ]; then printf '%s\n' 'ghcr.io/fixture-owner/sisag:old';
        else printf '%s\n' 'ghcr.io/fixture-owner/sisag:fixture-sha@sha256:fixture'; fi ;;
      '{{if .UpdateStatus}}{{.UpdateStatus.State}}{{end}}')
        case "$SCENARIO" in
          updating) echo updating ;; paused) echo paused ;; no_update) echo '' ;; *) echo completed ;;
        esac ;;
      '{{.Spec.Mode.Replicated.Replicas}}')
        if [ "$SCENARIO" = wrong_desired ]; then echo 1; else echo 2; fi ;;
      *) echo UNEXPECTED_DOCKER >&2; return 90 ;;
    esac
  elif [ "$1" = service ] && [ "$2" = ps ]; then
    case "$SCENARIO" in
      list_failure) return 72 ;; empty) echo '' ;; one_running) echo task1 ;;
      extra_running|terminal_history) printf 'task1\ntask2\ntask3\n' ;;
      *) printf 'task1\ntask2\n' ;;
    esac
  elif [ "$1" = inspect ] && [ "$2" = --type ] && [ "$3" = task ]; then
    if [ "$SCENARIO" = task_failure ] && [ "$4" = task2 ]; then return 73; fi
    case "$6" in
      '{{.Status.State}}')
        if [ "$SCENARIO" = transitioning ] && [ "$4" = task2 ]; then echo starting;
        elif [ "$SCENARIO" = terminal_history ] && [ "$4" = task3 ]; then echo shutdown;
        else echo running; fi ;;
      '{{.Spec.ContainerSpec.Image}}')
        if [ "$SCENARIO" = old_task ] && [ "$4" = task2 ]; then echo ghcr.io/fixture-owner/sisag:old;
        else echo ghcr.io/fixture-owner/sisag:fixture-sha@sha256:fixture; fi ;;
      *) echo UNEXPECTED_DOCKER >&2; return 90 ;;
    esac
  else echo UNEXPECTED_DOCKER >&2; return 90
  fi
}
`;

for (const scenario of ['healthy', 'terminal_history', 'old_service', 'updating', 'paused', 'no_update', 'wrong_desired', 'old_task', 'transitioning', 'one_running', 'extra_running', 'empty', 'inspect_failure', 'list_failure', 'task_failure']) {
  it('actual preflight with simulated Docker: '+scenario, () => {
    const allowed = ['healthy', 'terminal_history'].includes(scenario);
    const result = spawnSync(bash, ['--noprofile', '--norc', '-s'], {
      input: 'set -e\n'+fakeDocker+'\n'+preflight+'\nprintf "PREFLIGHT_ALLOWED\\n"\n',
      encoding: 'utf8', timeout: 10000,
      env: { PATH: '', SystemRoot: process.env.SystemRoot || '', SCENARIO: scenario },
    });
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    assert.ok(!result.stderr.includes('UNEXPECTED_DOCKER'), result.stderr);
    if (allowed) assert.equal(result.status, 0, result.stderr+'\n'+result.stdout);
    else assert.notEqual(result.status, 0, scenario+' should refuse');
    assert.equal(result.stdout.includes('PREFLIGHT_ALLOWED'), allowed, result.stdout);
  });
}
