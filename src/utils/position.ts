export function clampToViewport(
  x: number,
  y: number,
  menuWidth = 240,
  menuHeight = 260,
  padding = 8,
) {
  const maxX = Math.max(padding, window.innerWidth - menuWidth - padding);
  const maxY = Math.max(padding, window.innerHeight - menuHeight - padding);

  return {
    x: Math.min(Math.max(x, padding), maxX),
    y: Math.min(Math.max(y, padding), maxY),
  };
}
