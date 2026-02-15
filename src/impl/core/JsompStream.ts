import {IJsompStream, StreamOptions} from '../../types';

/**
 * JSOMP Stream Implementation
 * Handles stack-based JSON repair and plugin pipeline for AI streaming data.
 */
export class JsompStream implements IJsompStream {
  private buffer: string = '';
  private options: StreamOptions;

  constructor(options: StreamOptions = {}) {
    this.options = {
      autoRepair: true,
      ...options
    };
  }

  public write(chunk: any): void {
    let rawFragment = chunk;
    if (this.options.plugins) {
      for (const plugin of this.options.plugins) {
        rawFragment = plugin.transform(rawFragment);
      }
    }
    this.buffer += rawFragment;
    this.process();
  }

  public end(): void {
    this.process(true);
  }

  public reset(): void {
    this.buffer = '';
  }

  private process(isFinal: boolean = false): void {
    let currentBuffer = this.buffer.trim();
    if (!currentBuffer) return;

    let lastValidIndex = 0;
    let stackCount = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < currentBuffer.length; i++) {
      const char = currentBuffer[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }

      if (char === '"') inString = true;
      else if (char === '{' || char === '[') stackCount++;
      else if (char === '}' || char === ']') {
        stackCount--;
        if (stackCount === 0) {
          const objectStr = currentBuffer.substring(lastValidIndex, i + 1).trim();
          const cleanStr = objectStr.startsWith(',') ? objectStr.slice(1) : objectStr;

          const trimmed = cleanStr.trim();
          if (trimmed.startsWith('[')) {
            this.parseArrayStream(trimmed);
          } else if (trimmed.startsWith('{')) {
            this.parseObjectStream(trimmed);
          }
          lastValidIndex = i + 1;
        }
      }
    }

    this.buffer = currentBuffer.substring(lastValidIndex);
    let remainingFragment = this.buffer.trim();
    let partialData: any = null;

    if (remainingFragment) {
      let toRepair = remainingFragment;
      if (toRepair.startsWith(',')) {
        toRepair = '{' + toRepair.slice(1);
      } else if (!toRepair.startsWith('{') && !toRepair.startsWith('[')) {
        toRepair = '{' + toRepair;
      }

      if (this.options.autoRepair) {
        const result = this.repairJson(toRepair);
        try {
          partialData = JSON.parse(result.json);
          if (!isFinal && partialData && typeof partialData === 'object') {
            // Dispatch partials
            this.dispatchFormattedPatch(partialData);
          }
        } catch (e) { }
      }
    }

    if (isFinal) {
      this.options.onFinish?.(partialData);
    }
  }

  private parseArrayStream(text: string) {
    try {
      let json = text.trim();
      if (!json.endsWith(']')) json += ']';
      const nodes = JSON.parse(json);
      if (Array.isArray(nodes)) {
        nodes.forEach(node => {
          if (node && node.id) {
            this.dispatchSingleNode(node.id, node);
          }
        });
      }
    } catch (e) { }
  }

  private parseObjectStream(text: string) {
    try {
      let json = text.trim();
      if (!json.endsWith('}')) json += '}';
      const patches = JSON.parse(json);
      this.dispatchFormattedPatch(patches);
    } catch (e) { }
  }

  private dispatchFormattedPatch(data: any) {
    if (!data || typeof data !== 'object') return;
    if (Array.isArray(data)) {
      data.forEach(node => {
        if (node && node.id) this.dispatchSingleNode(node.id, node);
      });
    } else {
      Object.entries(data).forEach(([id, patch]) => {
        this.dispatchSingleNode(id, patch as any);
      });
    }
  }

  private dispatchSingleNode(id: string, data: any): void {
    if (!id || !data) return;
    if (this.options.atomRegistry) {
      this.options.atomRegistry.set(id, data);
    }
    this.options.onPatch?.({id, ...data});
  }

  private repairJson(str: string): {json: string; isPartial: boolean} {
    let stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') {inString = false; stack.pop();}
        continue;
      }
      if (char === '"') {inString = true; stack.push('"');}
      else if (char === '{') stack.push('{');
      else if (char === '[') stack.push('[');
      else if (char === '}') {if (stack[stack.length - 1] === '{') stack.pop();}
      else if (char === ']') {if (stack[stack.length - 1] === '[') stack.pop();}
    }

    let repair = '';
    for (let i = stack.length - 1; i >= 0; i--) {
      const s = stack[i];
      if (s === '"') repair += '"';
      else if (s === '{') {
        if (str.trim().endsWith(':')) repair += 'null';
        repair += '}';
      }
      else if (s === '[') repair += ']';
    }
    return {json: str + repair, isPartial: stack.length > 0};
  }
}
