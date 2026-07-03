export function moveSelection(currentIndex: number, direction: 1 | -1, itemCount: number): number {
  if (itemCount <= 0) {
    return -1;
  }
  if (currentIndex < 0) {
    return direction > 0 ? 0 : itemCount - 1;
  }
  return (currentIndex + direction + itemCount) % itemCount;
}
