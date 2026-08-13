// ---- Frame geometry (measured against assets/frame.png, 1500 x 1500) ----
const FRAME_SRC = "assets/frame.png";
const FRAME_W = 1500;
const FRAME_H = 1500;

// Center, size and rotation (degrees) of the polaroid photo slot (the dark
// grey box in frame.png). Measured directly on the image.
const SLOT = {
  cx: 309.80,
  cy: 611.13,
  w: 330.17,
  h: 282.49,
  angleDeg: -15.15,
};

// The empty olive box in frame.png reserved for the attendee's name.
// Axis-aligned box, measured directly on the image.
const NAME_BOX = {
  x: 788,
  y: 466,
  w: 572,
  h: 94,
};

// Caption used when opening the X (Twitter) share composer.
const SHARE_TEXT =
  "One team. One mission. Endless ideas. 🚀\n" +
  "See you at HH Goa 2026.\n\n" +
  "#FrameInGoa #HHGoa2026 #Team #Hackathon #Innovation";

const canvas = document.getElementById("posterCanvas");
const ctx = canvas.getContext("2d");
const fileInput = document.getElementById("fileInput");
const nameInput = document.getElementById("nameInput");
const dropzone = document.getElementById("dropzone");
const downloadBtn = document.getElementById("downloadBtn");
const shareBtn = document.getElementById("shareBtn");
const hint = document.getElementById("hint");

canvas.width = FRAME_W;
canvas.height = FRAME_H;

let frameImg = null;
let userImg = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Draws `img` inside the target box (dx, dy, dWidth, dHeight) using
// "cover" behaviour (crops instead of stretching), matching CSS
// background-size:cover / object-fit:cover.
function drawImageCover(context, img, dx, dy, dWidth, dHeight) {
  const imgRatio = img.width / img.height;
  const boxRatio = dWidth / dHeight;

  let sx, sy, sWidth, sHeight;

  if (imgRatio > boxRatio) {
    // image is wider than the box -> crop left/right
    sHeight = img.height;
    sWidth = sHeight * boxRatio;
    sx = (img.width - sWidth) / 2;
    sy = 0;
  } else {
    // image is taller than the box -> crop top/bottom
    sWidth = img.width;
    sHeight = sWidth / boxRatio;
    sx = 0;
    sy = (img.height - sHeight) / 2;
  }

  context.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
}

function render() {
  if (!frameImg) return;

  ctx.clearRect(0, 0, FRAME_W, FRAME_H);
  ctx.drawImage(frameImg, 0, 0, FRAME_W, FRAME_H);

  if (userImg) {
    ctx.save();
    ctx.translate(SLOT.cx, SLOT.cy);
    ctx.rotate((SLOT.angleDeg * Math.PI) / 180);
    drawImageCover(ctx, userImg, -SLOT.w / 2, -SLOT.h / 2, SLOT.w, SLOT.h);
    ctx.restore();
  }

  drawName(nameInput.value.trim());
}

// Fits the name inside NAME_BOX, shrinking the font size as needed, and
// draws it centered both horizontally and vertically in the box.
function drawName(name) {
  if (!name) return;

  const paddingX = 28;
  const maxWidth = NAME_BOX.w - paddingX * 2;
  const maxFontSize = NAME_BOX.h * 0.62;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#12331f";

  let fontSize = maxFontSize;
  const fontFamily = "'Arial Black', Arial, Helvetica, sans-serif";
  do {
    ctx.font = `900 ${fontSize}px ${fontFamily}`;
    const width = ctx.measureText(name).width;
    if (width <= maxWidth) break;
    fontSize -= 2;
  } while (fontSize > 10);

  const cx = NAME_BOX.x + NAME_BOX.w / 2;
  const cy = NAME_BOX.y + NAME_BOX.h / 2 + fontSize * 0.04;
  ctx.fillText(name.toUpperCase(), cx, cy);
  ctx.restore();
}

async function init() {
  frameImg = await loadImage(FRAME_SRC);
  render();
}
init();

function setHint(msg) {
  hint.textContent = msg || "";
}

function handleFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    setHint("Please choose an image file.");
    return;
  }
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      userImg = await loadImage(e.target.result);
      render();
      setHint("");
    } catch (err) {
      setHint("Could not load that image — try another file.");
    }
  };
  reader.readAsDataURL(file);
}

nameInput.addEventListener("input", render);

fileInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  handleFile(file);
});

// Drag & drop support on the dropzone
["dragenter", "dragover"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  })
);
["dragleave", "drop"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  })
);
dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  handleFile(file);
});

function canvasToBlob() {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

downloadBtn.addEventListener("click", async () => {
  const blob = await canvasToBlob();
  downloadBlob(blob, "frame-in-goa.png");
});

shareBtn.addEventListener("click", async () => {
  // 1. Download the composited image to the user's device.
  const blob = await canvasToBlob();
  downloadBlob(blob, "frame-in-goa.png");

  setHint("Image downloaded — attach it to your post on X.");

  // 2. Open X's compose window with the caption pre-filled.
  //    (X's web intent can't attach a file directly, so the user attaches
  //    the image that was just downloaded.)
  const tweetUrl = `https://x.com/intent/post?text=${encodeURIComponent(SHARE_TEXT)}`;
  window.open(tweetUrl, "_blank", "noopener");
});