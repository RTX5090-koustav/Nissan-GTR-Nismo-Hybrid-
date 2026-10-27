# H₂ / SPORT — GT-R R35 Hydrogen V8 Hybrid Prototype

A browser prototype built from the existing Hydrogen Fuel Cell project. This edition replaces the generated SUV body with the user-supplied Nissan GT-R R35 GLB model. The hybrid simulation, dashboard, statistics, powertrain animation, labels, camera controls, colour choices, and demo remain in place.

## Run it

Open `index.html` from a local web server or GitHub Pages. The 3D GLB is loaded as `models/nissan-gtr-r35.glb`; browsers generally block that request when the page is opened directly from a `file://` path. For a simple local preview, run `python -m http.server 8000` from this folder and open `http://localhost:8000`.

The page works as a static site and does not need a build step. Keep the `models/`, `vendor/`, CSS, and JavaScript files in the repository root beside `index.html`.

## Controls

- Drag the 3D view to orbit; scroll or pinch to zoom. Arrow keys orbit and plus/minus zoom when the canvas is focused.
- Choose Cutaway, Exterior, or Powertrain. **Open hood** raises the bonnet panel and reveals the illustrative hydrogen V8; press it again to close.
- The complete authored hood panel is separated in the included GLB, preserving its original curves, normals and vents. Exterior mode keeps the body solid while the hood opens.
- Paint choices also tint the bonnet and the pale windscreen panel shown in the supplied model, so those surfaces follow the selected body colour.
- All views share the supplied GT-R wheels. Suspension and axle connections follow their measured hub positions; the V8 sits forward inside the hood opening.
- The paint palette includes orange, blue, Midnight Purple (`#44216b`), Metallic Teal (`#007e85`), Cherry Red (`#B4142E`), and British Racing Green (`#124C37`), alongside the existing green, violet, and platinum choices. The selected colour is saved in local storage where available.
- Start system, Accelerator, Brake / regeneration, V8 handover, and Engine charging keep the existing simulated drive behaviour. Run demo shows electric launch, V8 handover, and regenerative braking.
- Engine sound is optional, off by default, and synthesized from the simulated V8 RPM after you turn it on.
- Reset drive restores energy and controls. Reset view restores the camera. Colour choices are saved in local storage where available.

## Prototype limits

All readings, vehicle behaviour, and engine sound are simulated. The supplied model is a visual GT-R exterior, not manufacturer CAD. The hinged bonnet, engine, battery, hydrogen tank, drivetrain, component placement, and power figures are illustrative and do not establish real-world fitment, safety, or performance. The hood toggle separates the bonnet surface from the supplied GT-R mesh and lifts that panel on an illustrative hinge, exposing the concept V8. Hinge placement and the hybrid package are prototype geometry, not factory CAD.

The model's supplied GLB includes its texture images. Extracted texture files are also retained in `models/textures/` as part of the user-provided asset set.

## Attribution

- Original concept foundation: [RTX5090-koustav/Hydrogen-Fuel-Cell](https://github.com/RTX5090-koustav/Hydrogen-Fuel-Cell).
- User-supplied GT-R R35 model files; the provided CGTrader listing credits **AutomotiveGarage**. The downloadable files shown by the user are listed as royalty-free.
- Three.js r128 and the matching GLTFLoader are included locally. See `LICENSE` and `THREE-LICENSE.txt`.

## GitHub Pages

Commit the complete contents of this folder to the repository's publishing branch, keeping `index.html` at the published root. In GitHub, open **Settings → Pages**, choose **Deploy from a branch**, select the branch and `/(root)`, then save. The site entry point is `index.html`.
