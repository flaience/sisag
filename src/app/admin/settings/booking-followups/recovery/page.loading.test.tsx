// Harness de hooks controlado: executa handlers da página, sem DOM/navegador.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
const h = vi.hoisted(() => ({ values: [] as any[], cursor: 0, mounted: false, effect: undefined as undefined | (() => void) }));
vi.mock('react', async importOriginal => {
 const actual = await importOriginal<typeof import('react')>();
 return { ...actual,
  useState: (initial: any) => { const i=h.cursor++; if(!(i in h.values))h.values[i]=initial; return [h.values[i], (v:any)=>{h.values[i]=typeof v==='function'?v(h.values[i]):v;}]; },
  useCallback: (fn:any)=>fn,
  useEffect: (fn:()=>void)=>{if(!h.mounted)h.effect=fn;},
 };
});
vi.mock('next/link',()=>({default:'a'}));
vi.mock('@/components/ui/button',()=>({Button:'button'}));
vi.mock('@/components/ui/card',()=>({Card:'section',CardContent:'div',CardHeader:'header',CardTitle:'h2'}));
vi.mock('@/components/ui/ActionFeedback',()=>({ActionFeedback:'feedback'}));
vi.mock('@/components/sisag',()=>({SisagPage:'main',SisagPageHeader:'page-header',SisagDataState:'data-state'}));
vi.mock('@/components/automation/RecoveryDraftReview',()=>({RecoveryDraftReview:'draft-review'}));
vi.mock('@/components/automation/RecoveryRecommendationReview',()=>({RecoveryRecommendationReview:'recommendation-review'}));
import Page from './page';
function render(){h.cursor=0;return Page();}
function nodes(tree:any):any[]{if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree||typeof tree!=='object')return [];return [tree,...nodes(tree.props?.children)];}
function text(tree:any):string{if(Array.isArray(tree))return tree.map(text).join('');if(typeof tree==='string'||typeof tree==='number')return String(tree);return tree?.props?text(tree.props.children):'';}
function button(label:string){const found=nodes(render()).find(n=>n.type==='button'&&text(n)===label);expect(found, 'button '+label).toBeTruthy();return found;}
function loading(){return nodes(render()).some(n=>n.type==='data-state'&&n.props.state==='loading');}
function alert(){return nodes(render()).some(n=>n.props?.role==='alert');}
async function flush(){for(let i=0;i<12;i++)await Promise.resolve();}
const data={items:[{id:'case-a',clientName:'CLIENTE A',clientPhone:null,score:1,priority:'urgent',status:'open',assignedTo:null,assignedName:null,openedAt:'2026-09-13T12:00:00Z',bookingStartTime:'2026-09-12T12:00:00Z'}],summary:{active:1,urgent:1,contacted:0,resolved:0}};
const ok=()=>Promise.resolve({ok:true,json:async()=>data});
let fetchMock:ReturnType<typeof vi.fn>;
async function mount(){render();h.mounted=true;h.effect?.();await flush();}
beforeEach(()=>{
 h.values=[];h.cursor=0;h.mounted=false;h.effect=undefined;
 vi.useFakeTimers();
 vi.spyOn(AbortSignal,'timeout').mockImplementation(ms=>{const c=new AbortController();setTimeout(()=>c.abort(),ms);return c.signal;});
 fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);vi.stubGlobal('React',React);
});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('recovery queue loading resilience — controlled hooks',()=>{
 it('leaves loading after the 15 second deadline',async()=>{
  fetchMock.mockImplementation((_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('timeout')))));
  await mount();expect(loading()).toBe(true);
  await vi.advanceTimersByTimeAsync(14999);expect(loading()).toBe(true);
  await vi.advanceTimersByTimeAsync(1);await flush();
  expect(loading()).toBe(false);expect(alert()).toBe(true);expect(button('Tentar carregar novamente').props.disabled).toBe(false);
  expect(fetchMock).toHaveBeenCalledTimes(1);
 });
 it('recovers after a failed read without a mutation',async()=>{
  fetchMock.mockRejectedValueOnce(new Error('offline')).mockImplementationOnce(ok);
  await mount();expect(alert()).toBe(true);
  button('Tentar carregar novamente').props.onClick();await flush();
  expect(alert()).toBe(false);expect(loading()).toBe(false);expect(text(render())).toContain('CLIENTE A');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls.every(([,options])=>!options.method)).toBe(true);
 });
 it('does not replay claim when the subsequent read fails and is retried',async()=>{
  fetchMock.mockImplementationOnce(ok).mockResolvedValueOnce({ok:true}).mockRejectedValueOnce(new Error('offline')).mockImplementationOnce(ok);
  await mount();button('Assumir').props.onClick();await flush();
  expect(alert()).toBe(true);expect(loading()).toBe(false);
  expect(nodes(render()).some(n=>n.type==='feedback'&&n.props.type==='success')).toBe(true);
  button('Tentar carregar novamente').props.onClick();await flush();
  const posts=fetchMock.mock.calls.filter(([,o])=>o.method==='POST');
  expect(posts).toHaveLength(1);expect(JSON.parse(posts[0][1].body)).toEqual({action:'claim'});
  expect(fetchMock).toHaveBeenCalledTimes(4);expect(alert()).toBe(false);
 });
 it('reports an uncertain mutation without automatically replaying it',async()=>{
  fetchMock.mockImplementationOnce(ok).mockRejectedValueOnce(new Error('timeout'));
  await mount();button('Assumir').props.onClick();await flush();
  const feedback=nodes(render()).find(n=>n.type==='feedback');
  expect(feedback.props.type).toBe('error');expect(feedback.props.message).toContain('antes de repetir');
  expect(button('Assumir').props.disabled).toBe(false);expect(fetchMock).toHaveBeenCalledTimes(2);
 });
});
