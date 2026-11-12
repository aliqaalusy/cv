export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
      });

    try {
      // Ambil semua anggota
      if (path === "/api/members" && method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT * FROM members ORDER BY created_at DESC"
        ).all();

        return json(results.map(m => ({
          id: m.id,
          name: m.name,
          nip: m.nip,
          dept: m.dept,
          photo: m.photo,
          landmarksVector: JSON.parse(m.landmarks_vector || "[]"),
          createdAt: m.created_at
        })));
      }

      // Simpan anggota
      if (path === "/api/members" && method === "POST") {
        const m = await request.json();
        const id = m.id || crypto.randomUUID();

        await env.DB.prepare(`
          INSERT INTO members
          (id, name, nip, dept, photo, landmarks_vector, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, m.name, m.nip || "", m.dept || "",
          m.photo || "",
          JSON.stringify(m.landmarksVector || []),
          m.createdAt || new Date().toISOString()
        ).run();

        return json({ success: true, id });
      }

      // Hapus anggota
      if (path.startsWith("/api/members/") && method === "DELETE") {
        const id = decodeURIComponent(path.split("/").pop());
        await env.DB.prepare(
          "DELETE FROM members WHERE id = ?"
        ).bind(id).run();

        return json({ success: true });
      }

      // Ambil riwayat presensi
      if (path === "/api/logs" && method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT * FROM logs ORDER BY timestamp DESC"
        ).all();

        return json(results.map(l => ({
          id: l.id,
          memberId: l.member_id,
          name: l.name,
          nip: l.nip,
          timestamp: l.timestamp,
          status: l.status,
          photo: l.photo
        })));
      }

      // Simpan presensi
      if (path === "/api/logs" && method === "POST") {
        const l = await request.json();
        const id = l.id || crypto.randomUUID();

        await env.DB.prepare(`
          INSERT INTO logs
          (id, member_id, name, nip, timestamp, status, photo)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, l.memberId || "", l.name || "",
          l.nip || "", l.timestamp || new Date().toISOString(),
          l.status || "Hadir", l.photo || ""
        ).run();

        return json({ success: true, id });
      }

      // Hapus seluruh riwayat presensi
      if (path === "/api/logs" && method === "DELETE") {
        await env.DB.prepare("DELETE FROM logs").run();
        return json({ success: true });
      }

      // Hapus seluruh anggota
      if (path === "/api/members" && method === "DELETE") {
        await env.DB.prepare("DELETE FROM members").run();
        return json({ success: true });
      }

      // Tampilkan website
      return env.ASSETS.fetch(request);

    } catch (error) {
      return json({ success: false, error: error.message }, 500);
    }
  }
};
