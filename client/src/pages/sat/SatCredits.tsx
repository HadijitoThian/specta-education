/** /sat/credits — live Emma minutes: today's free allowance, paid credit balance, buy hours via Xendit. */
import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Headphones, CheckCircle2, Clock } from "lucide-react";
import SatShell from "./SatShell";

const PACKS = [1, 2, 3, 5] as const;

export default function SatCredits() {
  const search = useSearch();
  const paid = new URLSearchParams(search).get("paid");
  const utils = trpc.useUtils();
  const me = trpc.sat.me.useQuery(undefined, { retry: false });
  const lang = (me.data?.lang || "en") as "en" | "id";
  const quota = trpc.sat.liveQuota.useQuery(undefined, { enabled: !!me.data, refetchInterval: paid === "1" ? 5000 : false });
  const orders = trpc.sat.creditOrders.useQuery(undefined, { enabled: !!me.data, refetchInterval: paid === "1" ? 5000 : false });
  const [hours, setHours] = useState<number>(1);
  const [err, setErr] = useState<string | null>(null);
  const buy = trpc.sat.buyCredits.useMutation({ onSuccess: (d) => { window.location.href = d.invoiceUrl; }, onError: (e) => setErr(e.message) });
  useEffect(() => { if (paid === "1") { utils.sat.liveQuota.invalidate(); utils.sat.creditOrders.invalidate(); } }, [paid]); // eslint-disable-line react-hooks/exhaustive-deps

  const t = lang === "id" ? {
    title: "Kredit bicara dengan Emma", rule: "Setiap minggu kamu bisa bicara dan berdiskusi dengan Emma secara gratis selama", perDay: "jam. Jatah ini di-reset setiap hari Senin. Chat teks dengan Emma tidak dibatasi.", more: "Ingin lebih dari itu? Beli kredit seharga", perHour: "per jam. Kredit tidak hangus dan dipakai hanya setelah jatah gratis mingguanmu habis.",
    today: "Minggu ini", used: "terpakai", left: "sisa gratis", credit: "Kredit tersimpan", buy: "Beli kredit", hour: "jam", pay: "Bayar dengan Xendit", paying: "Membuka pembayaran…", history: "Riwayat pembelian", none: "Belum ada pembelian.", paidOk: "Pembayaran diterima. Kreditmu sudah ditambahkan.", paidWait: "Terima kasih! Kami menunggu konfirmasi pembayaran, biasanya kurang dari 1 menit.", paidNo: "Pembayaran belum selesai. Kamu bisa coba lagi di bawah.", status: { pending: "menunggu", paid: "lunas", expired: "kedaluwarsa", failed: "gagal" },
  } : {
    title: "Talk-to-Emma credit", rule: "Every week you can talk and discuss with Emma for free for", perDay: "hours. The allowance resets every Monday. Text chat with Emma is unlimited.", more: "Want more than that? Buy credit at", perHour: "per hour. Credit never expires and is only used after your free weekly hours are gone.",
    today: "This week", used: "used", left: "free left", credit: "Credit balance", buy: "Buy credit", hour: "hour", pay: "Pay with Xendit", paying: "Opening payment…", history: "Purchase history", none: "No purchases yet.", paidOk: "Payment received. Your credit has been added.", paidWait: "Thanks! Waiting for payment confirmation, usually under a minute.", paidNo: "Payment wasn't completed. You can try again below.", status: { pending: "pending", paid: "paid", expired: "expired", failed: "failed" },
  };
  const latestPaid = (orders.data || []).find(o => o.status === "paid" && o.paidAt && Date.now() - new Date(o.paidAt).getTime() < 10 * 60000);

  return (
    <SatShell title={t.title} back="/sat">
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Headphones className="w-6 h-6 text-indigo-600" />{t.title}</h1>
          {quota.data && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{t.rule} <b>{quota.data.freeMinutesPerWeek / 60}</b> {t.perDay} {t.more} <b>Rp {quota.data.pricePerHour.toLocaleString("id-ID")}</b> {t.perHour}</p>}
        </div>

        {paid === "1" && <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${latestPaid ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>{latestPaid ? <CheckCircle2 className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}{latestPaid ? t.paidOk : t.paidWait}</div>}
        {paid === "0" && <div className="rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-800">{t.paidNo}</div>}

        {quota.data ? (
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4"><div className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{t.today} · {t.used}</div><div className="text-2xl font-black mt-1">{Math.round(quota.data.usedWeekSec / 60)} <span className="text-sm text-slate-400">min</span></div></div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4"><div className="text-[11px] uppercase tracking-wider text-slate-500">{t.today} · {t.left}</div><div className="text-2xl font-black mt-1">{Math.floor(quota.data.freeRemainingSec / 60)} <span className="text-sm text-slate-400">/ {quota.data.freeMinutesPerWeek} min</span></div></div>
            <div className="bg-indigo-600 text-white rounded-2xl p-4"><div className="text-[11px] uppercase tracking-wider text-indigo-200">{t.credit}</div><div className="text-2xl font-black mt-1">{Math.floor(quota.data.creditSec / 60)} <span className="text-sm text-indigo-200">min</span></div></div>
          </div>
        ) : <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}

        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold mb-3">{t.buy}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {PACKS.map(h => <button key={h} onClick={() => setHours(h)} className={`rounded-xl border-2 p-3 text-left ${hours === h ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-400"}`}><div className="text-lg font-black">{h} {t.hour}{h > 1 && lang === "en" ? "s" : ""}</div><div className="text-xs text-slate-600">Rp {((quota.data?.pricePerHour || 129000) * h).toLocaleString("id-ID")}</div></button>)}
          </div>
          {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
          <button onClick={() => { setErr(null); buy.mutate({ hours }); }} disabled={buy.isPending || !quota.data} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2">{buy.isPending && <Loader2 className="w-4 h-4 animate-spin" />}{buy.isPending ? t.paying : `${t.pay} · Rp ${((quota.data?.pricePerHour || 129000) * hours).toLocaleString("id-ID")}`}</button>
          <p className="text-[11px] text-slate-400 mt-3">QRIS, bank transfer, e-wallets and cards via Xendit. The invoice link is also emailed to you.</p>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold mb-2">{t.history}</h2>
          {(orders.data?.length || 0) === 0 ? <div className="text-sm text-slate-500">{t.none}</div> : (
            <ul className="text-sm divide-y divide-slate-100">{orders.data!.map(o => (
              <li key={o.id} className="py-2 flex items-center justify-between gap-3">
                <span>{new Date(o.createdAt).toLocaleDateString()} · {o.hours} {t.hour}{o.hours > 1 && lang === "en" ? "s" : ""} · Rp {o.amount.toLocaleString("id-ID")}</span>
                <span className="flex items-center gap-2"><span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${o.status === "paid" ? "bg-emerald-100 text-emerald-800" : o.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600"}`}>{t.status[o.status]}</span>{o.status === "pending" && o.invoiceUrl && <a href={o.invoiceUrl} className="text-xs underline text-indigo-700">{lang === "id" ? "Bayar" : "Pay"}</a>}</span>
              </li>
            ))}</ul>
          )}
        </section>
      </div>
    </SatShell>
  );
}
