"use client";

export function TombolCetak() {
  return (
    <button className="tombol" onClick={() => window.print()}>
      Cetak
    </button>
  );
}
