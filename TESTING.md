# Verification — prototype 01

## GT-R bonnet and wheel fit correction

- Geometry check: all 12,012 bonnet triangles retain their original vertices and normals. The remaining body and separated hood together contain exactly the original triangles, with no duplication or loss.
- Transform check: attaching the bonnet to its hinge preserves its closed position; opening and closing returns to the same transform.
- Browser check: bonnet opens smoothly and closes flush; the forward V8 is visible with the solid exterior, and no detached triangles appear.
- Browser check: Exterior, Cutaway and Powertrain use the same four original GT-R wheel assemblies. Axles and suspension connect to those hub centres.
- JavaScript syntax and the existing simulation checks pass. No browser errors were reported during these checks.

## Automated simulation checks

Run `node simulation.test.js`.

Passed: system-off does not propel or consume energy; electric launch consumes battery before hydrogen; V8 handover occurs; engine charging consumes hydrogen; braking reduces speed and charges the battery; no regeneration while stopped or full; low-battery engine override; empty-tank electric fallback; both depleted prevents propulsion; shutdown stops fuel use; changing RPM threshold changes the handover; charging toggle and 80% target; 50,000-step finite-value and energy-store bounds check.

JavaScript syntax checked with `node --check` for application, scene and simulation files.

## Browser checks

Tested in the Codex Chromium browser at wide and narrow panel sizes:

- Page and local Three.js dependency load; WebGL renders the model.
- Exterior, cutaway, powertrain, engine close-up and reset camera respond.
- Palette selection, label visibility, auto-rotation and assumptions disclosure respond.
- Manual accelerator and 3,000 RPM handover update the UI.
- Electric launch transitions to V8 AWD with generator charging.
- Braking shows regenerative charging and deceleration.
- Demo runs and returns control; reset restores charge, fuel and pedals.
- Narrow layout stacks the console below the viewer.

A first-frame timing error found during browser testing was fixed by clamping elapsed animation time to non-negative values. The subsequent demo and manual driving tests continued without another rendering exception.

## Limits

No physical vehicle validation, manufacturer CAD comparison, Safari/Firefox device testing, real touchscreen testing or GitHub deployment was performed. This is an educational prototype with explicitly assumed values, not a validated vehicle engineering simulation.
