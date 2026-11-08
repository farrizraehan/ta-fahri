import { db } from "@/lib/supabase";
import { labelPeran, wajib, type Peran } from "@/lib/auth";
import { FormPengguna } from "./form-pengguna";
import { ubahAktif } from "./actions";

export const dynamic = "force-dynamic";

export default async function Pengguna() {
  const u = await wajib("admin");
  const { data } = await db().from("profil").select("*").order("dibuat");
  const { data: auth } = await db().auth.admin.listUsers({ perPage: 200 });
  const email = new Map((auth?.users ?? []).map((x) => [x.id, x.email]));
  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="judul">Pengguna</h1>
      <div className="kartu overflow-x-auto">
        <table className="tabel">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Peran</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((p) => (
              <tr key={p.id}>
                <td>{p.nama}</td>
                <td>{email.get(p.id)}</td>
                <td>{labelPeran[p.peran as Peran]}</td>
                <td>
                  {p.id === u.id ? (
                    "Anda"
                  ) : (
                    <form action={ubahAktif}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="aktif" value={p.aktif ? "0" : "1"} />
                      <button className="underline">{p.aktif ? "Aktif — nonaktifkan" : "Nonaktif — aktifkan"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FormPengguna />
    </div>
  );
}
