import { wajib } from "@/lib/auth";
import { FormImpor } from "./form-impor";

export default async function Impor() {
  await wajib("admin");
  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="judul">Impor Data Siswa</h1>
      <div className="kartu space-y-2 text-sm text-gray-700">
        <p>Format yang didukung:</p>
        <ul className="list-disc pl-5">
          <li><b>Data kartu pelajar</b>: satu sheet per kelas (7a, 8B, …), kolom Nama Lengkap, Tempat Lahir, Tanggal Lahir, NIS, NISN, Alamat.</li>
          <li><b>Daftar Siswa EMIS</b>: kolom Nama Lengkap, NISN, Tingkat - Rombel, Status, Jenis Kelamin, No Telepon, Nama Ayah Kandung.</li>
        </ul>
        <p>Siswa dicocokkan berdasarkan NISN/NIS, jadi file yang sama boleh diimpor ulang tanpa membuat data dobel. NIK tidak diimpor.</p>
      </div>
      <FormImpor />
    </div>
  );
}
