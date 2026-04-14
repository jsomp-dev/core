/**
 * Keyboard Utilities for JSOMP
 */
export const KeyboardUtils = {
  /**
   * Matches a KeyboardEvent against a JSOMP key string (e.g., 'ctrl+s')
   */
  isMatch(e: KeyboardEvent, keyStr: string): boolean {
    const parts = keyStr.toLowerCase().split('+');
    const key = parts.pop(); // Last part is the actual key
    
    // Check modifiers
    const hasCtrl = parts.includes('ctrl') || parts.includes('control');
    const hasShift = parts.includes('shift');
    const hasAlt = parts.includes('alt');
    const hasMeta = parts.includes('meta') || parts.includes('cmd');

    if (e.ctrlKey !== hasCtrl) return false;
    if (e.shiftKey !== hasShift) return false;
    if (e.altKey !== hasAlt) return false;
    if (e.metaKey !== hasMeta) return false;

    // Check key
    const eventKey = e.key.toLowerCase();
    
    // Handle aliases
    const aliases: Record<string, string> = {
      'esc': 'escape',
      'enter': 'enter',
      'space': ' '
    };

    const targetKey = aliases[key!] || key;
    return eventKey === targetKey;
  }
};
