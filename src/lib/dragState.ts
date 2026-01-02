/**
 * Global state to track if a keyboard drag is in progress.
 * Used by useKeyboardShortcuts to disable shortcuts during keyboard dragging.
 */
let isKeyboardDragging = false;

export function getIsKeyboardDragging(): boolean {
  return isKeyboardDragging;
}

export function setIsKeyboardDragging(dragging: boolean): void {
  isKeyboardDragging = dragging;
}
