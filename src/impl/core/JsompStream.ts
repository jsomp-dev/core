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
    if (!currentBuffer && !isFinal) return;

    let lastValidIndex = 0;
    let stackCount = 0;
    let inString = false;
    let escaped = false;
    let startIndex = -1;

    for (let i = 0; i < currentBuffer.length; i++) {
      const char = currentBuffer[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }

      if (char === '"') inString = true;
      else if (char === '{' || char === '[') {
        if (stackCount === 0) startIndex = i;
        stackCount++;
      }
      else if (char === '}' || char === ']') {
        stackCount--;
        if (stackCount < 0) {
          stackCount = 0;
          lastValidIndex = i + 1;
        } else if (stackCount === 0) {
          if (startIndex !== -1) {
            const objectStr = currentBuffer.substring(startIndex, i + 1);
            const trimmed = objectStr.trim();
            if (trimmed.startsWith('[')) {
              this.parseArrayStream(trimmed);
            } else if (trimmed.startsWith('{')) {
              this.parseObjectStream(trimmed);
            }
          }
          lastValidIndex = i + 1;
        }
      }
    }

    // Update buffer with remaining fragment
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
          // Only dispatch if it's a non-empty object/array
          if (!isFinal && partialData && typeof partialData === 'object' && Object.keys(partialData).length > 0) {
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
        if (id === '_fixed') return;
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
    const stack: {char: string, hasColon: boolean}[] = [];
    let inString = false;
    let escaped = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        stack.push({char: '{', hasColon: false});
      } else if (char === '[') {
        stack.push({char: '[', hasColon: false});
      } else if (char === '}') {
        if (stack.length && stack[stack.length - 1].char === '{') stack.pop();
      } else if (char === ']') {
        if (stack.length && stack[stack.length - 1].char === '[') stack.pop();
      } else if (char === ':') {
        if (stack.length && stack[stack.length - 1].char === '{') {
          stack[stack.length - 1].hasColon = true;
        }
      } else if (char === ',') {
        if (stack.length) {
          stack[stack.length - 1].hasColon = false;
        }
      }
    }

    let repair = '';
    for (let i = stack.length - 1; i >= 0; i--) {
      const ctx = stack[i];
      if (ctx.char === '{') {
        const currentTotal = (str + repair).trim();
        if (currentTotal.endsWith(':')) {
          repair += 'null';
        } else if (currentTotal.endsWith(',')) {
          repair += '"_fixed":null';
        } else {
          if (!ctx.hasColon) {
            if (currentTotal.endsWith('"')) {
              repair += ':null';
            }
          }
        }
        repair += '}';
      } else if (ctx.char === '[') {
        const currentTotal = (str + repair).trim();
        if (currentTotal.endsWith(',')) {
          repair += 'null';
        }
        repair += ']';
      }
    }
    return {json: str + repair, isPartial: stack.length > 0};
  }
}
