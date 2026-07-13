export const IMPROVEMENT_IMAGE_ZOOM = {
  min: 0.5,
  max: 3,
  step: 0.25,
} as const;

export function clampImprovementImageZoom(value: number) {
  return Math.min(
    IMPROVEMENT_IMAGE_ZOOM.max,
    Math.max(IMPROVEMENT_IMAGE_ZOOM.min, value),
  );
}
