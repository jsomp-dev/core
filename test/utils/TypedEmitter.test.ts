import {describe, it, expect, vi, beforeEach} from 'vitest';
import {TypedEmitter} from '../../src/utils/TypedEmitter';

interface TestEvents {
  foo: {value: string};
  bar: number;
}

describe('TypedEmitter', () => {
  let emitter: TypedEmitter<TestEvents>;

  beforeEach(() => {
    emitter = new TypedEmitter<TestEvents>();
  });

  it('should emit and receive events', () => {
    const spy = vi.fn();
    emitter.on('foo', spy);

    emitter.emit('foo', {value: 'test'});
    expect(spy).toHaveBeenCalledWith({value: 'test'});
  });

  it('should support unsubscribing via return function', () => {
    const spy = vi.fn();
    const unsub = emitter.on('bar', spy);

    unsub();
    emitter.emit('bar', 123);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should support unsubscribing via off method', () => {
    const spy = vi.fn();
    emitter.on('bar', spy);

    emitter.off('bar', spy);
    emitter.emit('bar', 123);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should handle removing all listeners', () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();

    emitter.on('foo', spy1);
    emitter.on('bar', spy2);

    emitter.removeAllListeners();

    emitter.emit('foo', {value: 'test'});
    emitter.emit('bar', 123);

    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();
  });

  it('should handle removing listeners for specific event', () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();

    emitter.on('foo', spy1);
    emitter.on('bar', spy2);

    emitter.removeAllListeners('foo');

    emitter.emit('foo', {value: 'test'});
    emitter.emit('bar', 123);

    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).toHaveBeenCalledWith(123);
  });
});
