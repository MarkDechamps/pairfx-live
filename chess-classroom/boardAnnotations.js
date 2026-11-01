// boardAnnotations.js — translates between cm-chessboard's annotation objects
// (arrows/markers typed by *object reference*, see app.js) and the plain
// { color, from, to } / { color, square } shape the sync protocol and PGN
// import use. No DOM; the type objects are passed in.

export function colorKeyFromClassName(className) {
  if (className.includes("danger")) return "danger";
  if (className.includes("info")) return "info";
  if (className.includes("warning")) return "warning";
  return "success";
}

// `board` is what cm-chessboard's getAnnotations() returns. Arrows whose type
// is in `excludedArrowTypes` (the teacher-only engine arrows) are dropped so
// they never reach the synced annotations.
export function annotationsFromBoard({ arrows, markers }, excludedArrowTypes = []) {
  return {
    arrows: arrows
      .filter((a) => !excludedArrowTypes.includes(a.type))
      .map((a) => ({ color: colorKeyFromClassName(a.type.class), from: a.from, to: a.to })),
    markers: markers.map((m) => ({ color: colorKeyFromClassName(m.type.class), square: m.square })),
  };
}

// The reverse: plain annotations -> what setAnnotations() takes. `arrowTypes`
// and `markerTypes` map a color key to the exact type object to draw with.
export function annotationsForBoard(annotations, arrowTypes, markerTypes) {
  return {
    arrows: (annotations.arrows || []).map((a) => ({ type: arrowTypes[a.color], from: a.from, to: a.to })),
    markers: (annotations.markers || []).map((m) => ({ type: markerTypes[m.color], square: m.square })),
  };
}
