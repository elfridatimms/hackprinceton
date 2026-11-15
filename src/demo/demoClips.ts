import type { Exercise } from "../movement/exercises";

/**
 * Recorded demo clips for presentations: a short video per game, stored in this
 * browser (IndexedDB) or shipped as /demo/<game>.webm|.mp4. Clips are played
 * through the real MediaPipe pipeline instead of the live camera.
 */
const DB_NAME = "rehabbit-demo",
  STORE = "clips";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = run(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
export const saveClip = (exercise: Exercise, blob: Blob) =>
  withStore("readwrite", (s) => s.put(blob, exercise)).then(() => undefined);
export const deleteClip = (exercise: Exercise) =>
  withStore("readwrite", (s) => s.delete(exercise)).then(() => undefined);
export const loadClip = (exercise: Exercise) =>
  withStore<Blob | undefined>("readonly", (s) => s.get(exercise)).then(
    (b) => b ?? null,
    () => null,
  );

/** A clip file shipped with the app in public/demo, if present. */
export async function bundledClip(exercise: Exercise): Promise<string | null> {
  for (const ext of ["webm", "mp4"]) {
    const url = `/demo/${exercise}.${ext}`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && type.startsWith("video/")) return url;
    } catch {
      /* not shipped */
    }
  }
  return null;
}
export type ClipSource = { kind: "recorded"; blob: Blob } | { kind: "bundled"; url: string };
export async function findClip(exercise: Exercise): Promise<ClipSource | null> {
  const blob = await loadClip(exercise);
  if (blob) return { kind: "recorded", blob };
  const url = await bundledClip(exercise);
  return url ? { kind: "bundled", url } : null;
}

/**
 * Turns a looping clip into a camera-like MediaStream. The clip is drawn into
 * a canvas, which works in browsers without HTMLMediaElement.captureStream.
 */
export async function clipStream(source: ClipSource): Promise<MediaStream> {
  const video = document.createElement("video");
  const objectUrl = source.kind === "recorded" ? URL.createObjectURL(source.blob) : null;
  video.src = objectUrl ?? (source as { url: string }).url;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  await video.play();
  if (!video.videoWidth)
    await new Promise((r) => video.addEventListener("loadedmetadata", r, { once: true }));
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d")!;
  let raf = 0;
  const draw = () => {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    raf = requestAnimationFrame(draw);
  };
  draw();
  // Keep drawing when rAF is throttled (hidden tab) so tracking never stalls.
  const timer = setInterval(() => ctx.drawImage(video, 0, 0, canvas.width, canvas.height), 100);
  const stream = canvas.captureStream(30);
  const cleanup = () => {
    cancelAnimationFrame(raf);
    clearInterval(timer);
    video.pause();
    video.removeAttribute("src");
    video.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };
  for (const track of stream.getTracks()) {
    const stop = track.stop.bind(track);
    track.stop = () => {
      cleanup();
      stop();
    };
  }
  return stream;
}

export const cameraConstraints: MediaStreamConstraints = {
  audio: false,
  video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
};

/** Records `seconds` of the camera into a clip. Calls onTick with seconds left. */
export async function recordClip(
  stream: MediaStream,
  seconds: number,
  onTick: (left: number) => void,
): Promise<Blob> {
  const type = ["video/webm;codecs=vp9", "video/webm", "video/mp4"].find((t) =>
    MediaRecorder.isTypeSupported(t),
  );
  const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || type }));
  });
  recorder.start(250);
  for (let left = seconds; left > 0; left--) {
    onTick(left);
    await new Promise((r) => setTimeout(r, 1000));
  }
  onTick(0);
  recorder.stop();
  return done;
}
