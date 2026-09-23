// Vercel Functions cap a buffered response at 4.5MB, but a genuinely streamed response is exempt.
// This chunks bytes into a ReadableStream so exports stay correct at any size instead of
// silently failing once a shop's history grows past a few MB.
const CHUNK_SIZE = 256 * 1024;

export function streamBytes(bytes, { contentType, filename }) {
  const stream = new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        controller.enqueue(bytes.subarray(i, i + CHUNK_SIZE));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export function streamText(text, options) {
  return streamBytes(new TextEncoder().encode(text), options);
}
