/**
 * Clamp a number between a minimum and maximum value.
 */
export default function clamp(number: number, min: number, max: number) {
  return Math.min(Math.max(number, min), max);
}
