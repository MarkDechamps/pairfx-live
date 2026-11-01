// projectorView.js — what the projector tab should show for a sync pointer
// and the overlay prefs, as plain data. projector.js only paints this.

// Visibility + text of the two text overlays.
export function overlayView(pointer, overlays) {
  const moveLabel = pointer.moveLabel || "";
  const title = pointer.gameTitle || "";
  return {
    moveNumber: { hidden: !overlays.moveNumber || !moveLabel, text: moveLabel },
    gameTitle: { hidden: !overlays.gameTitle || !title, text: title },
  };
}

// The annotations to draw: nothing when the arrows overlay is off, and an
// unknown color falls back to "success" instead of throwing mid-lesson.
export function annotationsToDraw(pointer, overlays, knownArrowColors, knownMarkerColors) {
  if (!overlays.arrows) return { arrows: [], markers: [] };
  const pick = (color, known) => (known.includes(color) ? color : "success");
  return {
    arrows: (pointer.arrows || []).map((a) => ({
      color: pick(a.color, knownArrowColors),
      from: a.from,
      to: a.to,
    })),
    markers: (pointer.markers || []).map((m) => ({ color: pick(m.color, knownMarkerColors), square: m.square })),
  };
}

export function isBlack(orientation) {
  return orientation === "black";
}
