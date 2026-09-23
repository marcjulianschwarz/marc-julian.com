import fs from "fs";
import path from "path";
import { visit } from "unist-util-visit";
import { h } from "hastscript";

// Written by the photo-images integration next to the generated variants
function readSize(slug) {
  const file = path.join(process.cwd(), "public", "photos", slug, "meta.json");
  if (!fs.existsSync(file)) return undefined;
  return JSON.parse(fs.readFileSync(file, "utf8")).medium;
}

// Slug of a photo is its filename without extension. Keep this in sync with lib/photos.ts.
function photoSlug(file) {
  return file.replace(/\.[^.]+$/, "");
}

function slugFromSrc(src) {
  return photoSlug(src.split("/").pop() ?? "");
}

function downloadIcon() {
  return h(
    "svg",
    {
      width: "14",
      height: "14",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    [
      h("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
      h("polyline", { points: "7 10 12 15 17 10" }),
      h("line", { x1: "12", y1: "15", x2: "12", y2: "3" }),
    ],
  );
}

function mailIcon() {
  return h(
    "svg",
    {
      width: "15",
      height: "15",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    [
      h("rect", { x: "2", y: "4", width: "20", height: "16", rx: "2" }),
      h("path", { d: "m22 7-10 6L2 7" }),
    ],
  );
}

function cameraIcon() {
  return h(
    "svg",
    {
      width: "15",
      height: "15",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    [
      h("path", { d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" }),
      h("circle", { cx: "12", cy: "13", r: "3" }),
    ],
  );
}

function metaRow(label, value) {
  return h("div", { class: "photo-meta-row" }, [h("dt", label), h("dd", String(value))]);
}

function buildCameraDetails(camera) {
  const settings = camera?.settings ?? {};
  const rows = [];

  const body = [camera?.make, camera?.model].filter(Boolean).join(" ");
  if (body) rows.push(metaRow("Camera", body));
  if (camera?.lens) rows.push(metaRow("Lens", camera.lens));
  if (camera?.film) rows.push(metaRow("Film", camera.film));
  if (settings.focalLength) rows.push(metaRow("Focal length", settings.focalLength));
  if (settings.aperture) rows.push(metaRow("Aperture", settings.aperture));
  if (settings.shutter) rows.push(metaRow("Shutter", settings.shutter));
  if (settings.iso) rows.push(metaRow("ISO", settings.iso));

  if (rows.length === 0) return null;

  return h("details", { class: "photo-details" }, [
    h("summary", { class: "photo-summary", title: "Camera details" }, [cameraIcon()]),
    h("dl", { class: "photo-meta" }, rows),
  ]);
}

function buildPhotoBlock(photo, requestEmail) {
  const slug = photo.slug ?? photoSlug(photo.file);
  const base = `/photos/${slug}`;
  const title = photo.title ?? slug;
  const size = readSize(slug);

  const children = [
    h("picture", [
      h("source", { srcset: `${base}/medium.webp`, type: "image/webp" }),
      h("img", {
        src: `${base}/medium.jpg`,
        alt: title,
        width: size?.width,
        height: size?.height,
        loading: "lazy",
        decoding: "async",
        class: "photo-img",
      }),
    ]),
  ];

  const subject = `Request for higher resolution: ${title}`;
  const body = `Hi MJ,\n\nI would like to request a higher resolution version of this photo:\n\nTitle: ${title}\nSlug: ${slug}\n\n`;
  const requestHref = `mailto:${requestEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const right = [
    h("a", { href: `${base}/original.jpg`, download: true, class: "photo-action", title: "Download" }, [
      downloadIcon(),
    ]),
    h("a", { href: requestHref, class: "photo-action", title: "Request higher resolution" }, [mailIcon()]),
  ];

  const details = buildCameraDetails(photo.camera);
  if (details) right.unshift(details);

  // Title, location and description are only used for the gallery, the post body carries the prose
  children.push(
    h("figcaption", { class: "photo-caption" }, [h("div", { class: "photo-bar" }, right)]),
  );

  // Bound tall images by width instead of max-height, so the space the browser
  // reserves from the img attributes matches the final layout exactly
  const style = size ? `--photo-ratio: ${(size.width / size.height).toFixed(4)}` : undefined;

  return h("figure", { class: "photo-block", id: `photo-${slug}`, style }, children);
}

export function rehypePhotoBlocks(options = {}) {
  const requestEmail = options.requestEmail ?? "hi@marc-julian.de";
  const enabled = options.enabled ?? true;

  return (tree, file) => {
    // While the feature flag is off the images stay plain markdown images
    if (!enabled) return;

    const frontmatter = file.data?.astro?.frontmatter ?? {};
    const photos = frontmatter.photos ?? [];
    if (photos.length === 0) return;

    // Index the declared photos by slug so markdown images can be matched
    const bySlug = new Map();
    for (const photo of photos) {
      bySlug.set(photo.slug ?? photoSlug(photo.file), photo);
    }

    visit(tree, "element", (node, index, parent) => {
      if (!parent || index === undefined) return;

      // rehype-figure wraps images in a figure, so unwrap that first
      const img =
        node.tagName === "img"
          ? node
          : node.tagName === "figure" && node.children.find((c) => c.tagName === "img");

      if (!img || !img.properties?.src) return;

      const photo = bySlug.get(slugFromSrc(String(img.properties.src)));
      if (!photo) return;

      parent.children[index] = buildPhotoBlock(photo, requestEmail);
      return index;
    });
  };
}
