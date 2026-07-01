export async function sha256Hex(input) {
  if (input == null) throw new TypeError('sha256Hex input is required');

  const data = input instanceof ArrayBuffer
    ? input
    : input instanceof Uint8Array
      ? input
      : typeof input === 'string'
        ? new TextEncoder().encode(input)
        : typeof input.arrayBuffer === 'function'
          ? await input.arrayBuffer()
          : (() => {
            throw new TypeError('sha256Hex input must be a string, ArrayBuffer, TypedArray, or Blob-like object');
          })();

  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
