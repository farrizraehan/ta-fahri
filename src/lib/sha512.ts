/**
 * Implementasi algoritma SHA-512 (FIPS PUB 180-4) dari nol, tanpa library kriptografi.
 *
 * Ringkasan langkah:
 *  1. Pesan diubah menjadi byte UTF-8.
 *  2. Padding: tambah bit '1', lalu bit '0' sampai panjang ≡ 896 (mod 1024),
 *     lalu 128 bit panjang pesan asli. Hasil: kelipatan blok 1024 bit (128 byte).
 *  3. Nilai hash awal H0..H7 (8 × 64 bit).
 *  4. Setiap blok: bentuk message schedule W0..W79, lalu 80 putaran kompresi
 *     dengan konstanta K0..K79 dan fungsi Ch, Maj, Σ0, Σ1, σ0, σ1.
 *  5. Hasil akhir: gabungan H0..H7 = 512 bit = 128 karakter heksadesimal.
 *
 * Bilangan 64 bit diolah dengan BigInt dan dibatasi dengan MASK (mod 2^64).
 */

const MASK = (1n << 64n) - 1n;

// 80 konstanta putaran: 64 bit pertama bagian pecahan akar pangkat tiga 80 bilangan prima pertama.
const K: bigint[] = [
  "428a2f98d728ae22", "7137449123ef65cd", "b5c0fbcfec4d3b2f", "e9b5dba58189dbbc", "3956c25bf348b538",
  "59f111f1b605d019", "923f82a4af194f9b", "ab1c5ed5da6d8118", "d807aa98a3030242", "12835b0145706fbe",
  "243185be4ee4b28c", "550c7dc3d5ffb4e2", "72be5d74f27b896f", "80deb1fe3b1696b1", "9bdc06a725c71235",
  "c19bf174cf692694", "e49b69c19ef14ad2", "efbe4786384f25e3", "0fc19dc68b8cd5b5", "240ca1cc77ac9c65",
  "2de92c6f592b0275", "4a7484aa6ea6e483", "5cb0a9dcbd41fbd4", "76f988da831153b5", "983e5152ee66dfab",
  "a831c66d2db43210", "b00327c898fb213f", "bf597fc7beef0ee4", "c6e00bf33da88fc2", "d5a79147930aa725",
  "06ca6351e003826f", "142929670a0e6e70", "27b70a8546d22ffc", "2e1b21385c26c926", "4d2c6dfc5ac42aed",
  "53380d139d95b3df", "650a73548baf63de", "766a0abb3c77b2a8", "81c2c92e47edaee6", "92722c851482353b",
  "a2bfe8a14cf10364", "a81a664bbc423001", "c24b8b70d0f89791", "c76c51a30654be30", "d192e819d6ef5218",
  "d69906245565a910", "f40e35855771202a", "106aa07032bbd1b8", "19a4c116b8d2d0c8", "1e376c085141ab53",
  "2748774cdf8eeb99", "34b0bcb5e19b48a8", "391c0cb3c5c95a63", "4ed8aa4ae3418acb", "5b9cca4f7763e373",
  "682e6ff3d6b2b8a3", "748f82ee5defb2fc", "78a5636f43172f60", "84c87814a1f0ab72", "8cc702081a6439ec",
  "90befffa23631e28", "a4506cebde82bde9", "bef9a3f7b2c67915", "c67178f2e372532b", "ca273eceea26619c",
  "d186b8c721c0c207", "eada7dd6cde0eb1e", "f57d4f7fee6ed178", "06f067aa72176fba", "0a637dc5a2c898a6",
  "113f9804bef90dae", "1b710b35131c471b", "28db77f523047d84", "32caab7b40c72493", "3c9ebe0a15c9bebc",
  "431d67c49c100d4c", "4cc5d4becb3e42b6", "597f299cfc657e2a", "5fcb6fab3ad6faec", "6c44198c4a475817",
].map((h) => BigInt("0x" + h));

// Nilai hash awal: 64 bit pertama bagian pecahan akar kuadrat 8 bilangan prima pertama.
const H_AWAL: bigint[] = [
  "6a09e667f3bcc908", "bb67ae8584caa73b", "3c6ef372fe94f82b", "a54ff53a5f1d36f1",
  "510e527fade682d1", "9b05688c2b3e6c1f", "1f83d9abfb41bd6b", "5be0cd19137e2179",
].map((h) => BigInt("0x" + h));

/** Rotasi kanan 64 bit. */
const rotr = (x: bigint, n: bigint) => ((x >> n) | (x << (64n - n))) & MASK;

const Ch = (x: bigint, y: bigint, z: bigint) => (x & y) ^ (~x & MASK & z);
const Maj = (x: bigint, y: bigint, z: bigint) => (x & y) ^ (x & z) ^ (y & z);
const SIGMA0 = (x: bigint) => rotr(x, 28n) ^ rotr(x, 34n) ^ rotr(x, 39n);
const SIGMA1 = (x: bigint) => rotr(x, 14n) ^ rotr(x, 18n) ^ rotr(x, 41n);
const sigma0 = (x: bigint) => rotr(x, 1n) ^ rotr(x, 8n) ^ (x >> 7n);
const sigma1 = (x: bigint) => rotr(x, 19n) ^ rotr(x, 61n) ^ (x >> 6n);

/** Langkah 2: padding pesan menjadi kelipatan 128 byte. */
export function padding(pesan: Uint8Array): Uint8Array {
  const panjangBit = BigInt(pesan.length) * 8n;
  let total = pesan.length + 1 + 16;
  total += (128 - (total % 128)) % 128;
  const hasil = new Uint8Array(total);
  hasil.set(pesan);
  hasil[pesan.length] = 0x80; // bit '1' diikuti nol
  for (let i = 0; i < 16; i++) {
    hasil[total - 1 - i] = Number((panjangBit >> BigInt(8 * i)) & 0xffn);
  }
  return hasil;
}

/** Hitung SHA-512 dari teks atau byte, hasil berupa 128 karakter heksadesimal. */
export function sha512(input: string | Uint8Array): string {
  const pesan = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const data = padding(pesan);
  const H = [...H_AWAL];
  const W = new Array<bigint>(80);

  for (let blok = 0; blok < data.length; blok += 128) {
    // Langkah 4a: message schedule
    for (let t = 0; t < 16; t++) {
      let w = 0n;
      for (let b = 0; b < 8; b++) w = (w << 8n) | BigInt(data[blok + t * 8 + b]);
      W[t] = w;
    }
    for (let t = 16; t < 80; t++) {
      W[t] = (sigma1(W[t - 2]) + W[t - 7] + sigma0(W[t - 15]) + W[t - 16]) & MASK;
    }

    // Langkah 4b: 80 putaran kompresi
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 80; t++) {
      const T1 = (h + SIGMA1(e) + Ch(e, f, g) + K[t] + W[t]) & MASK;
      const T2 = (SIGMA0(a) + Maj(a, b, c)) & MASK;
      h = g;
      g = f;
      f = e;
      e = (d + T1) & MASK;
      d = c;
      c = b;
      b = a;
      a = (T1 + T2) & MASK;
    }

    // Langkah 4c: tambahkan hasil blok ke nilai hash
    H[0] = (H[0] + a) & MASK;
    H[1] = (H[1] + b) & MASK;
    H[2] = (H[2] + c) & MASK;
    H[3] = (H[3] + d) & MASK;
    H[4] = (H[4] + e) & MASK;
    H[5] = (H[5] + f) & MASK;
    H[6] = (H[6] + g) & MASK;
    H[7] = (H[7] + h) & MASK;
  }

  // Langkah 5: gabungkan H0..H7
  return H.map((x) => x.toString(16).padStart(16, "0")).join("");
}

/** Hitung berapa bit yang berbeda di antara dua hash hex (untuk uji avalanche effect). */
export function bitBerbeda(hexA: string, hexB: string): number {
  let n = 0;
  for (let i = 0; i < hexA.length; i++) {
    let x = parseInt(hexA[i], 16) ^ parseInt(hexB[i], 16);
    while (x) {
      n += x & 1;
      x >>= 1;
    }
  }
  return n;
}
