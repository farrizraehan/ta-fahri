import "server-only";
import QRCode from "qrcode";

/** URL verifikasi publik yang dicetak sebagai QR di kuitansi. */
export function urlCek(noKuitansi: string, hash: string) {
  const asal = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${asal}/cek/${encodeURIComponent(noKuitansi)}?h=${hash}`;
}

export async function qrSvg(teks: string) {
  return QRCode.toString(teks, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}
