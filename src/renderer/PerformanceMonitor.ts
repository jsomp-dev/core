import {TopologySnapshot} from '../types';
import {jsompEnv} from "../JsompEnv";

/**
 * PerformanceMonitor
 * Responsibility: Monitor and alert on slow frames (Jank).
 */
export class PerformanceMonitor {
  private static _instance = new PerformanceMonitor();

  public static get instance() {
    return this._instance;
  }

  private constructor() { }

  private _lastReportedVersion = -1;

  /**
   * Process performance report after a render cycle
   */
  public report(snapshot: TopologySnapshot, activeNodes: number, frameFinishTime: number) {
    // Only report once per version to avoid stale metrics from unrelated React re-renders
    if (snapshot.version === this._lastReportedVersion) {
      return;
    }

    const metrics = snapshot.metrics;
    if (!metrics || metrics.startTime === undefined) return;

    this._lastReportedVersion = snapshot.version;

    // t1 = metrics.startTime
    // t3 = frameFinishTime

    // Total Latency (Data Arrival -> DOM Update)
    // Note: This assumes synchronous flow or captured timestamps are relative to same origin (performance.now)
    const totalLatency = frameFinishTime - metrics.startTime;

    const {reconcileMs = 0, pipelineMs = 0} = metrics;
    const reactRenderMs = totalLatency - reconcileMs; // Approximation of React portion

    // Jank Detection (16.6ms for 60fps)
    if (totalLatency > 16.6) {
      jsompEnv.logger.warn(
        `[JSOMP-JANK] Slow Frame Detected! (>16ms)\n` +
        `Version: ${snapshot.version}\n` +
        `Total Latency: ${totalLatency.toFixed(2)}ms\n` +
        `  - Kernel Reconcile: ${reconcileMs.toFixed(2)}ms\n` +
        `  - Pipeline Process: ${pipelineMs.toFixed(2)}ms\n` +
        `  - React Commit: ${reactRenderMs.toFixed(2)}ms\n` +
        `Active Nodes: ${activeNodes}`
      );
    }
  }
}
