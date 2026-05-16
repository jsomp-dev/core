import {beforeEach, describe, expect, it, vi} from 'vitest';
import {EventBus, EventSignalRegistry, EventTagRegistry, JsompEvents} from '../../src/engine/event';
import {EventSignalImpl} from '../../src/engine/event/EventSignal';
import {ActionRegistry} from '../../src/registry/ActionRegistry';
import {EventPhase} from '../../src/types/events';

describe('EventSignalImpl', () => {
  let signal: EventSignalImpl<{value: string}>;

  beforeEach(() => {
    signal = new EventSignalImpl<{value: string}>('test-event');
  });

  describe('subscribe / emit', () => {
    it('should emit and receive events in Finished phase by default', () => {
      const spy = vi.fn();
      signal.subscribe(spy);
      signal.emit({value: 'hello'});
      expect(spy).toHaveBeenCalledWith({value: 'hello'});
    });

    it('should support unsubscribing via returned function', () => {
      const spy = vi.fn();
      const unsub = signal.subscribe(spy);
      unsub();
      signal.emit({value: 'world'});
      expect(spy).not.toHaveBeenCalled();
    });

    it('should return the original callback when returnOriginCallback is true', () => {
      const spy = vi.fn();
      const result = signal.subscribe(spy, {returnOriginCallback: true});
      expect(result).toBe(spy);
    });

    it('should support subscribing to specific phases', () => {
      const willSpy = vi.fn();
      const finishedSpy = vi.fn();

      signal.subscribe(willSpy, {targetPhase: EventPhase.WillCommit});
      signal.subscribe(finishedSpy, {targetPhase: EventPhase.Finished});

      signal.emit({value: 'phase-test'}, EventPhase.WillCommit);
      expect(willSpy).toHaveBeenCalledWith({value: 'phase-test'});
      expect(finishedSpy).not.toHaveBeenCalled();

      signal.emit({value: 'phase-test'}, EventPhase.Finished);
      expect(finishedSpy).toHaveBeenCalledWith({value: 'phase-test'});
    });

    it('should support subscribing to Aborted and Error phases', () => {
      const abortedSpy = vi.fn();
      const errorSpy = vi.fn();

      signal.subscribe(abortedSpy, {targetPhase: EventPhase.Aborted});
      signal.subscribe(errorSpy, {targetPhase: EventPhase.Error});

      signal.emit({value: 'aborted'}, EventPhase.Aborted);
      expect(abortedSpy).toHaveBeenCalledWith({value: 'aborted'});

      signal.emit({value: 'error'}, EventPhase.Error);
      expect(errorSpy).toHaveBeenCalledWith({value: 'error'});
    });

    it('should handle multiple subscribers for the same event', () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();

      signal.subscribe(spy1);
      signal.subscribe(spy2);

      signal.emit({value: 'multi'});
      expect(spy1).toHaveBeenCalledWith({value: 'multi'});
      expect(spy2).toHaveBeenCalledWith({value: 'multi'});
    });

    it('should not throw when a handler throws', () => {
      const throwingSpy = vi.fn(() => {throw new Error('handler error');});
      const normalSpy = vi.fn();

      signal.subscribe(throwingSpy);
      signal.subscribe(normalSpy);

      expect(() => signal.emit({value: 'error-handling'})).not.toThrow();
      expect(normalSpy).toHaveBeenCalled();
    });
  });

  describe('emitLifecycle', () => {
    it('should go through WillCommit -> beforeCommit -> Finished', async () => {
      const willSpy = vi.fn();
      const finishedSpy = vi.fn();
      const beforeCommitSpy = vi.fn();

      signal.subscribe(willSpy, {targetPhase: EventPhase.WillCommit});
      signal.subscribe(finishedSpy, {targetPhase: EventPhase.Finished});

      await signal.emitLifecycle({value: 'lifecycle'}, beforeCommitSpy);

      expect(willSpy).toHaveBeenCalled();
      expect(beforeCommitSpy).toHaveBeenCalled();
      expect(finishedSpy).toHaveBeenCalled();
    });

    it('should go to Aborted phase when prevent() is called', async () => {
      const willSpy = vi.fn((event: any) => {event.prevent();});
      const abortedSpy = vi.fn();
      const finishedSpy = vi.fn();

      signal.subscribe(willSpy, {targetPhase: EventPhase.WillCommit});
      signal.subscribe(abortedSpy, {targetPhase: EventPhase.Aborted});
      signal.subscribe(finishedSpy, {targetPhase: EventPhase.Finished});

      await signal.emitLifecycle({value: 'prevented'});

      expect(abortedSpy).toHaveBeenCalled();
      expect(finishedSpy).not.toHaveBeenCalled();
    });

    it('should inject prevent() and timestamp into WillCommit payload', async () => {
      const willSpy = vi.fn();

      signal.subscribe(willSpy, {targetPhase: EventPhase.WillCommit});

      await signal.emitLifecycle({value: 'test'});

      const payload = willSpy.mock.calls[0][0];
      expect(payload.value).toBe('test');
      expect(typeof payload.prevent).toBe('function');
      expect(typeof payload.timestamp).toBe('number');
    });

    it('should go to Error phase when beforeCommit throws', async () => {
      const errorSpy = vi.fn();
      const finishedSpy = vi.fn();

      signal.subscribe(errorSpy, {targetPhase: EventPhase.Error});
      signal.subscribe(finishedSpy, {targetPhase: EventPhase.Finished});

      await signal.emitLifecycle(
        {value: 'error-case'},
        () => {throw new Error('commit failed');}
      );

      expect(errorSpy).toHaveBeenCalled();
      expect(finishedSpy).not.toHaveBeenCalled();
    });

    it('should support nested emitLifecycle without state corruption', async () => {
      const outerWillSpy = vi.fn();
      const innerWillSpy = vi.fn();
      const innerSignal = new EventSignalImpl<{nested: string}>('inner');

      signal.subscribe(outerWillSpy, {targetPhase: EventPhase.WillCommit});
      innerSignal.subscribe(innerWillSpy, {targetPhase: EventPhase.WillCommit});

      await signal.emitLifecycle({value: 'outer'}, async () => {
        await innerSignal.emitLifecycle({nested: 'inner'});
      });

      expect(outerWillSpy).toHaveBeenCalled();
      expect(innerWillSpy).toHaveBeenCalled();
    });
  });

  describe('clear / listenerCount', () => {
    it('should clear all subscribers', () => {
      signal.subscribe(vi.fn());
      signal.subscribe(vi.fn());
      expect(signal.listenerCount()).toBe(2);

      signal.clear();
      expect(signal.listenerCount()).toBe(0);
    });

    it('should clear subscribers for a specific phase', () => {
      signal.subscribe(vi.fn(), {targetPhase: EventPhase.WillCommit});
      signal.subscribe(vi.fn(), {targetPhase: EventPhase.Finished});
      expect(signal.listenerCount()).toBe(2);

      signal.clear(EventPhase.WillCommit);
      expect(signal.listenerCount(EventPhase.WillCommit)).toBe(0);
      expect(signal.listenerCount(EventPhase.Finished)).toBe(1);
    });
  });

  describe('name', () => {
    it('should return the event name', () => {
      expect(signal.name).toBe('test-event');
    });
  });
});

describe('JsompEvents (built-in events only)', () => {
  let jsompEvents: JsompEvents;
  let eventSignals: EventSignalRegistry;
  let eventBus: EventBus;
  let eventTags: EventTagRegistry;

  beforeEach(() => {
    eventSignals = new EventSignalRegistry();
    eventBus = new EventBus(eventSignals);
    eventTags = new EventTagRegistry(eventSignals, eventBus);
    jsompEvents = new JsompEvents(eventSignals, eventTags);
  });

  describe('built-in events', () => {
    it('should have setup event', () => {
      expect(jsompEvents.setup).toBeDefined();
      expect(jsompEvents.setup.name).toBe('jsomp:setup');
    });

    it('should have instanceReady event', () => {
      expect(jsompEvents.instanceReady).toBeDefined();
      expect(jsompEvents.instanceReady.name).toBe('jsomp:instance_ready');
    });
  });

  describe('setup event', () => {
    it('should emit setup event when JSOMP initialization completes', () => {
      const spy = vi.fn();
      jsompEvents.setup.subscribe(spy);

      jsompEvents.setup.emit({});

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('instanceReady event', () => {
    it('should emit instanceReady event with id, instance, and path via emitLifecycle', async () => {
      const spy = vi.fn();
      jsompEvents.instanceReady.subscribe(spy);

      await jsompEvents.instanceReady.emitLifecycle({
        id: 'node-1',
        instance: {ref: 'div'},
        path: 'root.child'
      });

      expect(spy).toHaveBeenCalledTimes(1);
      const callArg = spy.mock.calls[0][0];
      expect(callArg.id).toBe('node-1');
      expect(callArg.instance).toEqual({ref: 'div'});
      expect(callArg.path).toBe('root.child');
      expect(typeof callArg.timestamp).toBe('number');
    });

    it('should emit instanceReady event without path', async () => {
      const spy = vi.fn();
      jsompEvents.instanceReady.subscribe(spy);

      await jsompEvents.instanceReady.emitLifecycle({
        id: 'node-2',
        instance: {ref: 'span'}
      });

      expect(spy).toHaveBeenCalledTimes(1);
      const callArg = spy.mock.calls[0][0];
      expect(callArg.id).toBe('node-2');
      expect(callArg.instance).toEqual({ref: 'span'});
      expect(typeof callArg.timestamp).toBe('number');
    });
  });
});

describe('EventSignals', () => {
  let eventSignals: EventSignalRegistry;

  beforeEach(() => {
    eventSignals = new EventSignalRegistry();
  });

  describe('register', () => {
    it('should register a custom event and return an EventSignal', () => {
      const signal = eventSignals.register<{msg: string}>('myapp:customEvent');
      expect(signal).toBeDefined();
      expect(signal.name).toBe('myapp:customEvent');
    });

    it('should return the same signal for duplicate registration', () => {
      const signal1 = eventSignals.register('myapp:dup');
      const signal2 = eventSignals.register('myapp:dup');
      expect(signal1).toBe(signal2);
    });
  });

  describe('getSignal', () => {
    it('should return undefined for unregistered events', () => {
      const signal = eventSignals.getSignal('nonexistent');
      expect(signal).toBeUndefined();
    });

    it('should return the signal for registered events', () => {
      const registered = eventSignals.register('myapp:test');
      const retrieved = eventSignals.getSignal('myapp:test');
      expect(retrieved).toBe(registered);
    });
  });

  describe('getNames', () => {
    it('should return all registered signal names', () => {
      eventSignals.register('myapp:event1');
      eventSignals.register('myapp:event2');
      const names = eventSignals.getNames();
      expect(names).toContain('myapp:event1');
      expect(names).toContain('myapp:event2');
    });
  });
});

describe('EventTagRegistry', () => {
  let registry: EventTagRegistry;
  let eventSignals: EventSignalRegistry;
  let eventBus: EventBus;

  beforeEach(() => {
    eventSignals = new EventSignalRegistry();
    eventBus = new EventBus(eventSignals);
    registry = new EventTagRegistry(eventSignals, eventBus);
  });

  describe('validate', () => {
    it('should accept valid tag names', () => {
      const result = registry.validate('myapp:user_login');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty names', () => {
      const result = registry.validate('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject names without namespace separator', () => {
      const result = registry.validate('simpleEvent');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('namespace separator');
    });

    it('should reject reserved namespaces', () => {
      const result = registry.validate('dom:click');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('reserved');
    });

    it('should reject invalid namespace format', () => {
      const result = registry.validate('MyApp:event');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase');
    });

    it('should reject invalid event name format', () => {
      const result = registry.validate('myapp:UserLogin');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('snake_case');
    });
  });

  describe('isReserved', () => {
    it('should return true for reserved namespaces', () => {
      expect(registry.isReserved('dom')).toBe(true);
      expect(registry.isReserved('key')).toBe(true);
      expect(registry.isReserved('system')).toBe(true);
      expect(registry.isReserved('jsomp')).toBe(true);
    });

    it('should return false for non-reserved namespaces', () => {
      expect(registry.isReserved('myapp')).toBe(false);
      expect(registry.isReserved('custom')).toBe(false);
    });
  });

  describe('bindTag', () => {
    it('should bind a pre-registered signal as a tag with metadata', () => {
      eventSignals.register('myapp:user_login');
      registry.bindTag('myapp:user_login', {
        eventName: 'user_login',
        description: 'User login event',
        payloadType: '{ userId: string }',
        category: 'custom',
      });

      const tag = registry.getTag('myapp:user_login');
      expect(tag).toBeDefined();
      expect(tag!.name).toBe('myapp:user_login');
      expect(tag!.namespace).toBe('myapp');
      expect(tag!.eventName).toBe('user_login');
      expect(tag!.description).toBe('User login event');
      expect(tag!.payloadType).toBe('{ userId: string }');
      expect(tag!.category).toBe('custom');
    });

    it('should throw when signal is not pre-registered', () => {
      expect(() => registry.bindTag('myapp:not_registered', { eventName: 'not_registered' })).toThrow(
        '[EventTagRegistry] Signal "myapp:not_registered" not found.'
      );
    });

    it('should throw for invalid tag names', () => {
      expect(() => registry.bindTag('invalid', { eventName: 'test' })).toThrow();
    });

    it('should throw for reserved namespaces', () => {
      expect(() => registry.bindTag('dom:click', { eventName: 'click' })).toThrow();
    });

    it('should look up pre-registered signal via getSignal', () => {
      eventSignals.register('myapp:test_signal');
      registry.bindTag('myapp:test_signal', { eventName: 'test_signal' });
      const signal = registry.getSignal('myapp:test_signal');
      expect(signal).toBeDefined();
      expect(signal!.name).toBe('myapp:test_signal');
    });

    it('should support multiple events under the same namespace', () => {
      eventSignals.register('myapp:event_a');
      eventSignals.register('myapp:event_b');
      registry.bindTag('myapp:event_a', { eventName: 'event_a' });
      registry.bindTag('myapp:event_b', { eventName: 'event_b' });

      const signalA = registry.getSignal('myapp:event_a');
      const signalB = registry.getSignal('myapp:event_b');
      expect(signalA).toBeDefined();
      expect(signalB).toBeDefined();
      expect(signalA).not.toBe(signalB);
    });

    it('should bind with a custom targetPhase', () => {
      eventSignals.register('myapp:will_commit_event');
      registry.bindTag('myapp:will_commit_event', { eventName: 'will_commit_event', targetPhase: EventPhase.WillCommit });

      const tag = registry.getTag('myapp:will_commit_event');
      expect(tag).toBeDefined();
      expect(tag!.targetPhase).toBe(EventPhase.WillCommit);
    });

    it('should default targetPhase to Finished when not specified', () => {
      eventSignals.register('myapp:default_phase');
      registry.bindTag('myapp:default_phase', { eventName: 'default_phase' });

      const tag = registry.getTag('myapp:default_phase');
      expect(tag).toBeDefined();
      expect(tag!.targetPhase).toBe(EventPhase.Finished);
    });

    it('should throw when binding same signal + same phase twice', () => {
      eventSignals.register('myapp:dup_test');
      registry.bindTag('myapp:dup_test', { eventName: 'dup_test', targetPhase: EventPhase.WillCommit });
      expect(() =>
        registry.bindTag('myapp:dup_test', { eventName: 'dup_test', targetPhase: EventPhase.WillCommit })
      ).toThrow(/already bound/);
    });

    it('should throw when rebinding same signal (register returns same instance)', () => {
      const sig1 = eventSignals.register('myapp:rebind_test');
      registry.bindTag('myapp:rebind_test', { eventName: 'rebind_test' });

      const sig2 = eventSignals.register('myapp:rebind_test');
      expect(sig1).toBe(sig2);

      expect(() => registry.bindTag('myapp:rebind_test', { eventName: 'rebind_test' })).toThrow(/already bound/);
    });
  });

  describe('getSignal', () => {
    it('should return undefined for unregistered tags', () => {
      const signal = registry.getSignal('nonexistent:event');
      expect(signal).toBeUndefined();
    });

    it('should return the signal for a bound tag', () => {
      eventSignals.register('myapp:test');
      registry.bindTag('myapp:test', { eventName: 'test' });
      const signal = registry.getSignal('myapp:test');
      expect(signal).toBeDefined();
      expect(signal!.name).toBe('myapp:test');
    });
  });

  describe('getTagsByNamespace', () => {
    it('should return all tags under a namespace', () => {
      eventSignals.register('myapp:user_login');
      eventSignals.register('myapp:user_logout');
      eventSignals.register('other:event');
      registry.bindTag('myapp:user_login', { eventName: 'user_login' });
      registry.bindTag('myapp:user_logout', { eventName: 'user_logout' });
      registry.bindTag('other:event', { eventName: 'event' });

      const tags = registry.getTagsByNamespace('myapp');
      expect(tags).toHaveLength(2);
      expect(tags.map(t => t.name)).toContain('myapp:user_login');
      expect(tags.map(t => t.name)).toContain('myapp:user_logout');
    });
  });

  describe('getNamespaces', () => {
    it('should return all registered namespaces', () => {
      eventSignals.register('myapp:event1');
      eventSignals.register('other:event2');
      registry.bindTag('myapp:event1', { eventName: 'event1' });
      registry.bindTag('other:event2', { eventName: 'event2' });

      const namespaces = registry.getNamespaces();
      expect(namespaces).toContain('myapp');
      expect(namespaces).toContain('other');
    });
  });
});

describe('EventPhase', () => {
  it('should have all four phases defined', () => {
    expect(EventPhase.WillCommit).toBe('WillCommit');
    expect(EventPhase.Finished).toBe('Finished');
    expect(EventPhase.Aborted).toBe('Aborted');
    expect(EventPhase.Error).toBe('Error');
  });
});

describe('SubscribeEventOptions', () => {
  it('should default targetPhase to Finished', () => {
    const signal = new EventSignalImpl<{value: string}>('test');
    const spy = vi.fn();

    signal.subscribe(spy);
    signal.emit({value: 'default-phase'});

    expect(spy).toHaveBeenCalled();
  });

  it('should default returnOriginCallback to false', () => {
    const signal = new EventSignalImpl<{value: string}>('test');
    const spy = vi.fn();

    const result = signal.subscribe(spy);
    expect(result).not.toBe(spy);
    expect(typeof result).toBe('function');
  });
});