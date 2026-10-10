(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ClockLabModel = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var C = 299792458, METERS_PER_NS = C / 1e9, MAX_NS = 1e9;
  // Local planar least-squares model: east, north, receiver clock bias (in metres).
  // Unit vectors point from the receiver to each satellite. A positive satellite
  // transmit-clock error shortens that satellite's measured pseudorange.
  var ANGLES = [0.65, 2.05, 3.25, 5.35];
  function solve(matrix, rhs) {
    var rows = matrix.map(function (row, i) { return row.concat(rhs[i]); });
    for (var col = 0; col < 3; col++) {
      var pivot = col;
      for (var r = col + 1; r < 3; r++) if (Math.abs(rows[r][col]) > Math.abs(rows[pivot][col])) pivot = r;
      if (Math.abs(rows[pivot][col]) < 1e-10) throw new Error('Satellite geometry is singular');
      var swap = rows[pivot]; rows[pivot] = rows[col]; rows[col] = swap;
      var scale = rows[col][col];
      for (var j = col; j < 4; j++) rows[col][j] /= scale;
      for (r = 0; r < 3; r++) if (r !== col) {
        var factor = rows[r][col];
        for (j = col; j < 4; j++) rows[r][j] -= factor * rows[col][j];
      }
    }
    return rows.map(function (row) { return row[3]; });
  }
  function estimate(errors) {
    if (!Array.isArray(errors) || errors.length !== 4 || errors.some(function (v) { return typeof v !== 'number' || !isFinite(v); })) throw new TypeError('Four finite pseudorange errors required');
    var design = ANGLES.map(function (a) { return [-Math.cos(a), -Math.sin(a), 1]; });
    var matrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], rhs = [0, 0, 0];
    design.forEach(function (row, i) {
      row.forEach(function (v, j) {
        rhs[j] += v * errors[i];
        row.forEach(function (w, k) { matrix[j][k] += v * w; });
      });
    });
    var solution = solve(matrix, rhs);
    return { east: solution[0], north: solution[1], receiverBias: solution[2], positionError: Math.sqrt(solution[0] * solution[0] + solution[1] * solution[1]) };
  }
  function response(ns, direction) {
    ns = Number(ns); ns = isFinite(ns) ? Math.max(0, Math.min(MAX_NS, ns)) : 0;
    var signedNs = direction === 'behind' ? -ns : ns, range = -signedNs * METERS_PER_NS;
    var result = estimate([range, 0, 0, 0]);
    result.ns = ns; result.signedNs = signedNs; result.rangeError = Math.abs(range); result.signedRangeError = range;
    return result;
  }
  function constellation(clocks) {
    if (!Array.isArray(clocks) || clocks.length !== 4) throw new TypeError('Four satellite clock offsets required');
    clocks = clocks.map(function (n) { n = Number(n); return isFinite(n) ? Math.max(-MAX_NS, Math.min(MAX_NS, n)) : 0; });
    var ranges = clocks.map(function (n) { return -n * METERS_PER_NS; });
    var result = estimate(ranges);
    result.clocks = clocks;
    result.ns = Math.max.apply(null, clocks.map(Math.abs));
    result.rangeError = result.ns * METERS_PER_NS;
    result.receiverClockNs = result.receiverBias / METERS_PER_NS;
    result.common = result.ns > 0 && clocks.every(function (n) { return n === clocks[0]; });
    if (result.positionError < 1e-9) { result.east = 0; result.north = 0; result.positionError = 0; }
    return result;
  }
  return { C: C, METERS_PER_NS: METERS_PER_NS, MAX_NS: MAX_NS, ANGLES: ANGLES, estimate: estimate, response: response, constellation: constellation };
});
