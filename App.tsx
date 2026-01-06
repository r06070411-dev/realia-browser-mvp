im

useEffect(() => {
  try { localStorage.setItem("realia:cart", JSON.stringify(cart)); } catch(e){}
}, [cart]);

useEffect(() => {
  try { localStorage.setItem("realia:purchased", JSON.stringify(purchased)); } catch(e){}
}, [purchased]);
port React, { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import catalog from "./catalog.json";

type PresenceUser = {
  id: string;
  name: string;
  x: number;
  y: number;
  status: "available" | "busy" | "away" | string;
  lastSeen?: number;
};

type DMMessage = {
  id: string;
  kind: "dm";
  from: { id: string; name: string };
  to: string;
  text: string;
  ts: number;
};

type CallRoom = {
  id: string;
  kind: "call";
  context: string;
  from: { id: string; name: string };
  to: string;
  url: string;
  ts: number;
};

type PartnerRequest = {
  id: string;
  kind: "partner";
  from: { userId: string; name: string; company?: string; title?: string; tags?: string; region?: string; website?: string };
  to: string;
  note: string;
  ts: number;
};

type RequestItem = {
  request_id: string;
  requester_user_id: string;
  requester_name: string;
  text: string;
  category: string;
  budget_max: number;
  location_text: string;
  needs: string;
  ts: number;
  status: string;
};

type ProposalNotify = {
  proposal_id: string;
  request_id: string;
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  message: string;
  ts: number;
};

type JobPost = {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  detail: string;
  budget: string;
  tags: string;
  ts: number;
};

type AreaMessage = {
  id: string;
  kind: "area";
  area: string;
  from: { id: string; name: string };
  text: string;
  ts: number;
};

const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString();

const renderNotif = (n: any) => {
  const kind = String(n?.kind || "");
  const p = n?.payload || {};

const PREFS = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"
];
const CITY_HINTS: Record<string,string> = {
  "新宿":"東京都","渋谷":"東京都","港区":"東京都","千代田":"東京都","中央区":"東京都","品川":"東京都","目黒":"東京都",
  "横浜":"神奈川県","川崎":"神奈川県","相模原":"神奈川県",
  "大阪市":"大阪府","堺":"大阪府","豊中":"大阪府","吹田":"大阪府","東大阪":"大阪府",
  "名古屋":"愛知県","豊田":"愛知県",
  "福岡":"福岡県","北九州":"福岡県",
  "札幌":"北海道","仙台":"宮城県","広島":"広島県","京都":"京都府"
};
const guessPref = (text: string): string => {
  const t = String(text || "");
  for (const p of PREFS) if (t.includes(p)) return p;
  for (const k of Object.keys(CITY_HINTS)) if (t.includes(k)) return CITY_HINTS[k];
  return "";
};


const openNegotiation = (requestId: string) => {
  const s = socketRef.current;
  if (!s) return;
  s.emit("negotiation:get", { requestId });
};

  if (kind === "request") {
    const r = p.request || p;
    return (
      <div>
        <div style={{ fontWeight: 900 }}>{r.category || "依頼"}</div>
        <div className="muted">予算: {r.budget_max || "—"} / 場所: {r.location_text || "—"} / ニーズ: {r.needs || "—"}</div>
        <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{r.text || ""}</div>
      </div>
    );
  }
  if (kind === "proposal" || kind === "proposal_accepted") {
    return (
      <div>
        <div style={{ fontWeight: 900 }}>{p.from_name || "提案"}</div>
        <div className="muted">request: {p.request_id || "—"} / kind: {kind}</div>
        {p.room_url ? (
          <a href={p.room_url} target="_blank" rel="noreferrer">交渉ルームを開く</a>
        ) : null}
        <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{p.message || ""}</div>
              <div style={{ marginTop: 10 }} className="row">
                <button className="btn btnSecondary" onClick={() => {
                  setMidMode("requests");
                  setRequestsTab("inbox");
                  setFocusProposalId(String(p.proposal_id || ""));
                  setTab("map");
                  setToast("提案受信を開きました");
                  setTimeout(() => setToast(""), 1800);
                }}>提案を見る</button>
              </div>
      </div>
    );
  }
  if (kind === "request_negotiating") {
    return (
      <div>
        <div style={{ fontWeight: 900 }}>交渉開始</div>
        {p.room_url ? (
          <a href={p.room_url} target="_blank" rel="noreferrer">交渉ルームを開く</a>
        ) : null}
      </div>
    );
  }
  if (kind === "lead_candidate") {
          const p = (n.payload || {}) as any;
          return (
            <div>
              <div style={{ fontWeight: 900 }}>営業チャンス（自動ピックアップ）</div>
              <div className="muted">{p.category} / {p.location_text} / budget: {p.budget_max} / score: {p.score}</div>
              <div style={{ marginTop: 10 }} className="row">
                <button className="btn btnSecondary" onClick={() => {
                  setMidMode("requests");
                  setRequestsTab("member");
                  setFocusRequestId(String(p.request_id || ""));
                  setTab("map");
                  socketRef.current?.emit("request:list", { mine: false });
                }}>依頼を見る</button>
                <button className="btn" onClick={() => {
                  const s = socketRef.current;
                  if (!s) return;
                  const msg = prompt(`【ご提案】${p.category || "ご相談"}について、詳細を伺ってお見積り可能です。\nREALIA上で通話/チャットいかがでしょうか？`, `【ご提案】${p.category || "ご相談"}について、詳細を伺ってお見積り可能です。\nREALIA上で通話/チャットいかがでしょうか？`) || "";
                  if (!msg.trim()) return;
                  s.emit("proposal:send", { requestId: p.request_id, message: msg });
                  setToast("提案を送信しました");
                  setTimeout(() => setToast(""), 2600);
                }}>この依頼に提案する</button>
              </div>
              {p.exclusive_until ? (
                <div className="muted" style={{ marginTop: 8 }}>優先枠: {new Date(p.exclusive_until).toLocaleString()} まで</div>
              ) : null}
              {p.priority_rank ? (
                <div className="muted">優先順位: {p.priority_rank}</div>
              ) : null}
            </div>
          );
        }
        if (kind === "member_approved") {
          return (
            <div>
              <div style={{ fontWeight: 900 }}>加盟店承認されました（approved）</div>
              <div className="muted">ログイン画面で「加盟店モード」に切り替えて利用できます</div>
            </div>
              <div style={{ marginTop: 10 }} className="row" >
                <button className="btn btnSecondary" onClick={() => {
                  // jump to member requests list
                  setMidMode("requests");
                  setRequestsTab("member");
                  setFocusRequestId(String(r.request_id || ""));
                  setTab("map");
                  setToast("依頼一覧を開きました");
                  setTimeout(() => setToast(""), 1800);
                }}>依頼を見る</button>
              </div>
            </div>
          );
        }
        if (kind === "member_apply") {
    return (
      <div>
        <div style={{ fontWeight: 900 }}>加盟店申請を送信しました</div>
        <div className="muted">{p.company} / {p.region}</div>
      </div>
    );
  }
  return <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(p, null, 2)}</pre>;
};


const statusPill = (s: string) => {
  const lower = (s || "available").toLowerCase();
  if (lower === "available") return <span className="pill ok">商談OK</span>;
  if (lower === "busy") return <span className="pill danger">取り込み中</span>;
  return <span className="pill warn">離席</span>;
};

const BACKEND_URL =
  (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:8787";

export default function App() {
  const [tab, setTab] = useState<"map" | "chat" | "people">("map");

const [worldMode, setWorldMode] = useState<"AI"|"LIVE">("AI");
const [cameraMode, setCameraMode] = useState<"3RD"|"1ST">("3RD");
const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
const [cart, setCart] = useState<Product[]>(() => {
  try { return JSON.parse(localStorage.getItem("realia:cart") || "[]"); } catch(e){ return []; }
});
const [purchased, setPurchased] = useState<any[]>(() => {
  try { return JSON.parse(localStorage.getItem("realia:purchased") || "[]"); } catch(e){ return []; }
});

      const [midMode, setMidMode] = useState<"chat" | "jobs" | "requests">("chat");
      const [toast, setToast] = useState<string>("");

  const [name, setName] = useState<string>(() => localStorage.getItem("realia:name") || "");
      const [pin, setPin] = useState<string>(() => localStorage.getItem("realia:pin") || "");
      const [role, setRole] = useState<string>(() => localStorage.getItem("realia:role") || "user");
      const [needPin, setNeedPin] = useState<string>("");
      const [deviceId] = useState<string>(() => {
        const k = "realia:deviceId";
        const existing = localStorage.getItem(k);
        if (existing) return existing;
        const v = (crypto?.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`);
        try { localStorage.setItem(k, v); } catch {}
        return v;
      });
  const [authed, setAuthed] = useState(false);
  const [me, setMe] = useState<{ id: string; userId?: string; name: string } | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [nearby, setNearby] = useState<PresenceUser[]>([]);
  const [radius, setRadius] = useState(70);

  const [status, setStatus] = useState<"available" | "busy" | "away">("available");
  const [area, setArea] = useState("commerce");

  const [areaMsgs, setAreaMsgs] = useState<AreaMessage[]>([]);
  const [dmMsgs, setDmMsgs] = useState<DMMessage[]>([]);
  const [dmTo, setDmTo] = useState<string>("");
  const [text, setText] = useState<string>("");


// Business card (profile)
const [myCompany, setMyCompany] = useState<string>(() => localStorage.getItem("realia:company") || "");
const [myTitle, setMyTitle] = useState<string>(() => localStorage.getItem("realia:title") || "");
const [myTags, setMyTags] = useState<string>(() => localStorage.getItem("realia:tags") || "");
const [myRegion, setMyRegion] = useState<string>(() => localStorage.getItem("realia:region") || "");
const [myWebsite, setMyWebsite] = useState<string>(() => localStorage.getItem("realia:website") || "");

// Partnering
const [selectedUserId, setSelectedUserId] = useState<string>("");
const [partnerNote, setPartnerNote] = useState<string>("");
const [partnerInbox, setPartnerInbox] = useState<PartnerRequest[]>([]);

// Jobs board
const [jobs, setJobs] = useState<JobPost[]>([]);
const [jobTitle, setJobTitle] = useState<string>("");
const [jobDetail, setJobDetail] = useState<string>("");
const [jobBudget, setJobBudget] = useState<string>("");
const [jobTags, setJobTags] = useState<string>("");
const [jobQuery, setJobQuery] = useState<string>("");
const [jobFilterTag, setJobFilterTag] = useState<string>("");
const [jobFilterRegion, setJobFilterRegion] = useState<string>("");

// Requests/Proposals (AI pick + sales)
const [requests, setRequests] = useState<RequestItem[]>([]);
const [myRequests, setMyRequests] = useState<RequestItem[]>([]);
const [proposals, setProposals] = useState<ProposalNotify[]>([]);
const [sentProposals, setSentProposals] = useState<ProposalNotify[]>([]);
      const [memberStats, setMemberStats] = useState<any>(null);
const [propSearch, setPropSearch] = useState<string>("");

const [reqText, setReqText] = useState<string>("");
const [reqCategory, setReqCategory] = useState<string>("住宅塗装");
const [reqBudgetMax, setReqBudgetMax] = useState<string>("1000000");
const [reqLocation, setReqLocation] = useState<string>("");
const [reqNeeds, setReqNeeds] = useState<string>("");

// Member matching settings
const [memberCats, setMemberCats] = useState<string>("");
const [memberPriceMin, setMemberPriceMin] = useState<string>("0");
const [memberPriceMax, setMemberPriceMax] = useState<string>("0");

// Notifications (offline inbox)
const [notifs, setNotifs] = useState<any[]>([]);
const [notifSearch, setNotifSearch] = useState<string>("");
      const [showUnreadOnly, setShowUnreadOnly] = useState<boolean>(false);
      const [notifKindFilter, setNotifKindFilter] = useState<string>("");

// Negotiation
const [lastRoomUrl, setLastRoomUrl] = useState<string>("");
      const [negotiationRooms, setNegotiationRooms] = useState<Record<string,string>>({});
      const [focusRequestId, setFocusRequestId] = useState<string>("");
      const [focusProposalId, setFocusProposalId] = useState<string>("");

// Member application (user -> apply)
const [appCompany, setAppCompany] = useState<string>("");
const [appPhone, setAppPhone] = useState<string>("");
const [appCats, setAppCats] = useState<string>("");
const [appRegion, setAppRegion] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tRef = useRef<number>(0);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 120, y: 120 });

  const others = useMemo(
    () => presence.filter((u) => u.id !== me?.id),
    [presence, me?.id]
  );

  
// canvas roundRect polyfill
useEffect(() => {
  const proto: any = (window as any).CanvasRenderingContext2D?.prototype;
  if (proto && !proto.roundRect) {
    proto.roundRect = function (x: number, y: number, w: number, h: number, r: number) {
      const rr = Math.min(r, w/2, h/2);
      this.beginPath();
      this.moveTo(x+rr, y);
      this.arcTo(x+w, y, x+w, y+h, rr);
      this.arcTo(x+w, y+h, x, y+h, rr);
      this.arcTo(x, y+h, x, y, rr);
      this.arcTo(x, y, x+w, y, rr);
      this.closePath();
      return this;
    };
  }
}, []);

useEffect(() => {
    const s = io(BACKEND_URL, { transports: ["websocket"] });
    socketRef.current = s;

    s.on("connect", () => {
      // no-op
    });

    s.on("auth:need_pin", ({ reason }: { reason: string }) => {
          setNeedPin(reason || "pin_required");
          setToast(reason === "pin_wrong" ? "PINが違います" : "PINを入力してください");
          setTimeout(() => setToast(""), 2600);
        });

        s.on("name:ok", ({ name }: { name: string }) => {
          setMe((prev) => (prev ? { ...prev, name } : prev));
        });

        s.on("auth:ok", ({ id, userId, name, role, memberStatus, serviceAreas, memberCategories }: { id: string; userId: string; name: string; role?: string; memberStatus?: string; serviceAreas?: string; memberCategories?: string }) => {
      setMe({ id, userId, name, role: String(role||"user"), memberStatus: String(memberStatus||""), serviceAreas: String(serviceAreas||""), memberCategories: String(memberCategories||"") });
          if (String(role||"user") !== "member" && (localStorage.getItem("realia:role") === "member")) {
            // server downgraded role (not approved)
            try { localStorage.setItem("realia:role", "user"); } catch {}
            setToast("加盟店は承認後に有効です（いまは一般ユーザーとしてログイン）");
            setTimeout(() => setToast(""), 2600);
          }
      setAuthed(true);
          const s2 = socketRef.current;
          if (s2) {
            s2.emit("job:request_list");
            s2.emit("block:request_list");
            s2.emit("partner:inbox");
            s2.emit("member:get_settings");
            // fetch requests
            s2.emit("request:list", { mine: true });
            s2.emit("request:list", { mine: false });
            s2.emit("proposal:list", { mine: true });
            s2.emit("proposal:list", { mine: false });
            s2.emit("notif:list");
            s2.emit("profile:update", { company: myCompany, title: myTitle, tags: myTags, region: myRegion, website: myWebsite });
          }
    });

    s.on("presence:list", (list: PresenceUser[]) => {
      setPresence(list);
    });

    s.on("nearby:list", ({ nearby }: { radius: number; nearby: PresenceUser[] }) => {
      setNearby(nearby);
    });

    s.on("area:message", (msg: AreaMessage) => {
      setAreaMsgs((prev) => [...prev.slice(-199), msg]);
    });

    s.on("dm:message", (msg: DMMessage) => {
      setDmMsgs((prev) => [...prev.slice(-199), msg]);
    });

s.on("call:room", (payload: any) => {
  if (payload?.url) {
    window.open(payload.url, "_blank", "noopener,noreferrer");
  } else {
    alert("通話URLの生成に失敗しました");
  }
});

s.on("negotiation:room", ({ url }: any) => {
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
    setLastRoomUrl(String(url));
  }
});


    return () => {
      s.disconnect();
    };
  }, []);

  // Update server with position/status
  useEffect(() => {
    const s = socketRef.current;
    if (!s || !authed) return;
    s.emit("presence:update", { x: pos.x, y: pos.y, status });
    const t = setInterval(() => {
      s.emit("presence:update", { x: pos.x, y: pos.y, status });
      s.emit("nearby:request", { radius });
    }, 1200);
    return () => clearInterval(t);
  }, [authed, pos.x, pos.y, status, radius]);

  // Draw map
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    // handle HiDPI
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.floor(rect.width * dpr);
    c.height = Math.floor(rect.height * dpr);
    ctx.scale(dpr, dpr);

    
const SHOP_PORTALS = (catalog?.shops || []) as Shop[];

const portalPoints = SHOP_PORTALS.map((s, i) => {
  // Place shops along a gentle curve (Central Avenue) to feel more like a street
  const col = i % 3;
  const row = Math.floor(i / 3);
  const baseX = 92 + col * 170;
  const baseY = 120 + row * 120;
  const curve = Math.sin((baseX + 20) * 0.012) * 22;
  return { shop: s, x: baseX + curve, y: baseY };
});

const eventSquare = { x: 520, y: 360, w: 160, h: 110, label: "EVENT SQUARE" };
const landmark = { x: 220, y: 35, label: "LANDMARK HOLO" };
const draw = () => {
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // neon street background
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(6,10,18,1)";
      ctx.fillRect(0,0,w,h);

// wet neon road reflection (subtle)
const roadGrad = ctx.createLinearGradient(0, h*0.55, 0, h);
roadGrad.addColorStop(0, "rgba(74,163,255,.00)");
roadGrad.addColorStop(0.35, "rgba(74,163,255,.10)");
roadGrad.addColorStop(0.7, "rgba(153,255,204,.08)");
roadGrad.addColorStop(1, "rgba(255,215,128,.06)");
ctx.fillStyle = roadGrad;
ctx.fillRect(0, h*0.52, w, h*0.48);

// mirror streaks
ctx.globalAlpha = 0.45;
ctx.strokeStyle = "rgba(255,255,255,.08)";
ctx.lineWidth = 1;
for (let i=0;i<12;i++){
  const yy = h*0.58 + i*18 + (Math.sin((t+i)*0.07)*3);
  ctx.beginPath();
  ctx.moveTo(24, yy);
  ctx.lineTo(w-24, yy + Math.sin((t+i)*0.04)*2);
  ctx.stroke();
}
ctx.globalAlpha = 1;

// draw buildings (simple silhouettes) + signage
const skyline = [
  { x: 18, w: 70, h: 140 },
  { x: 98, w: 56, h: 110 },
  { x: 165, w: 78, h: 165 },
  { x: 260, w: 62, h: 130 },
  { x: 332, w: 84, h: 175 },
  { x: 430, w: 60, h: 120 },
  { x: 500, w: 96, h: 190 },
];
ctx.save();
for (const b of skyline) {
  const bx = b.x;
  const by = h*0.12 + (Math.sin((bx+t)*0.01)*4);
  ctx.fillStyle = "rgba(255,255,255,.02)";
  (ctx as any).roundRect(bx, by, b.w, b.h, 10);
  ctx.fill();
  // window dots
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "rgba(74,163,255,.18)";
  for (let yy=by+14; yy<by+b.h-10; yy+=18){
    for (let xx=bx+10; xx<bx+b.w-10; xx+=16){
      if (((xx+yy+t) % 5) < 2) ctx.fillRect(xx, yy, 2, 2);
    }
  }
  ctx.globalAlpha = 1;
}
// vertical light beams
for (let i=0;i<4;i++){
  const x = 80 + i*140 + Math.sin((t+i)*0.03)*6;
  const grad = ctx.createLinearGradient(x, 0, x, h);
  grad.addColorStop(0, "rgba(74,163,255,.00)");
  grad.addColorStop(0.25, "rgba(74,163,255,.18)");
  grad.addColorStop(1, "rgba(74,163,255,.00)");
  ctx.fillStyle = grad;
  ctx.fillRect(x-10, 0, 20, h);
}
ctx.restore();

      // avenues
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(74,163,255,.28)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, h*0.35);
      ctx.quadraticCurveTo(w*0.55, h*0.22, w-20, h*0.35);
      ctx.stroke();
      ctx.strokeStyle = "rgba(153,255,204,.18)";
      ctx.beginPath();
      ctx.moveTo(20, h*0.7);
      ctx.quadraticCurveTo(w*0.55, h*0.58, w-20, h*0.7);
      ctx.stroke();

      // subtle grid glow
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = "rgba(255,255,255,.10)";
      for (let x = 0; x <= w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
      }
      for (let y = 0; y <= h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
      }

      // hologram landmark
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "rgba(255,255,255,.08)";
      ctx.fillRect(landmark.x-58, landmark.y-18, 116, 30);
      ctx.strokeStyle = "rgba(255,93,93,.55)";
      ctx.strokeRect(landmark.x-58, landmark.y-18, 116, 30);
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "rgba(233,240,255,.92)";
      ctx.fillText(landmark.label, landmark.x-50, landmark.y+2);

      // shop hologram portals
      for (const p of portalPoints) {
        const holo = String(p.shop.holo||"FLOAT");
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.roundRect(p.x-54, p.y-20, 108, 38, 10);
        ctx.fillStyle = holo === "LANDMARK" ? "rgba(255,215,120,.10)" : (holo === "WINDOW" ? "rgba(153,255,204,.08)" : "rgba(74,163,255,.10)");
        ctx.fill();
        ctx.strokeStyle = holo === "LANDMARK" ? "rgba(255,215,120,.55)" : (holo === "WINDOW" ? "rgba(153,255,204,.45)" : "rgba(74,163,255,.55)");
        ctx.stroke();
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "rgba(233,240,255,.95)";
        ctx.fillText(p.shop.name, p.x-44, p.y-2);
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "rgba(233,240,255,.75)";
        ctx.fillText(String(p.shop.tagline||""), p.x-44, p.y+12);
      }

      // grid (legacy)
      // grid
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "rgba(255,255,255,.10)";
      for (let x = 0; x <= w; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // radius
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(74,163,255,.35)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // others
      for (const u of others) {
        ctx.beginPath();
        ctx.arc(u.x, u.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,.75)";
        ctx.fill();
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "rgba(233,240,255,.9)";
        ctx.fillText(u.name, u.x + 10, u.y - 10);
      }

      // me
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(74,163,255,.95)";
      ctx.fill();
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "rgba(233,240,255,.95)";
      ctx.fillText(me?.name || "Me", pos.x + 10, pos.y - 10);

      requestAnimationFrame(draw);
    };
    draw();
  }, [pos.x, pos.y, radius, others, me?.name]);

  const onJoin = () => {
    const s = socketRef.current;
    if (!s) return;
    const n = (name || "").trim();
    if (!n) return;
    localStorage.setItem("realia:name", n);
    s.emit("auth:join", { name: n, deviceId, pin: pin.trim(), role });
          try { localStorage.setItem("realia:role", role); } catch {}
          try { localStorage.setItem("realia:pin", pin.trim()); } catch {}
  };

  const sendArea = () => {
    const s = socketRef.current;
    if (!s || !text.trim()) return;
    s.emit("area:send", { area, text: text.trim() });
    setText("");
  };

  const saveProfile = () => {
  const s = socketRef.current;
  if (!s) return;
  localStorage.setItem("realia:company", myCompany);
  localStorage.setItem("realia:title", myTitle);
  localStorage.setItem("realia:tags", myTags);
  localStorage.setItem("realia:region", myRegion);
  localStorage.setItem("realia:website", myWebsite);
  s.emit("profile:update", { company: myCompany, title: myTitle, tags: myTags, region: myRegion, website: myWebsite });
};

const dmSocketForUserId = (uid: string) => {
  const p = presence.find(x => String(x.userId || "") === uid);
  return p?.id || "";
};

      const sendPartnerRequest = () => {
  const s = socketRef.current;
  if (!s || !selectedUserId) return;
  s.emit("partner:request", { toUserId: selectedUserId, note: partnerNote.trim() });
  setPartnerNote("");
  alert("提携申請を送信しました（相手側の『提携受信箱』に届きます）");
};

const createJob = () => {
  const s = socketRef.current;
  if (!s || !jobTitle.trim()) return;
  s.emit("job:create", { title: jobTitle.trim(), detail: jobDetail.trim(), budget: jobBudget.trim(), tags: jobTags.trim() });
  setJobTitle(""); setJobDetail(""); setJobBudget(""); setJobTags("");
};

const blockUser = (targetUserId: string) => {
  const s = socketRef.current;
  if (!s) return;
  s.emit("block:add", { targetUserId });
  setToast("ブロックしました");
  setTimeout(() => setToast(""), 2600);
};

const unblockUser = (targetUserId: string) => {
  const s = socketRef.current;
  if (!s) return;
  s.emit("block:remove", { targetUserId });
  setToast("ブロック解除しました");
  setTimeout(() => setToast(""), 2600);
};

const reportUser = (targetUserId: string, context: string) => {
  const s = socketRef.current;
  if (!s) return;
  s.emit("report:send", { targetUserId, reason: "abuse", context, detail: "" });
};

const deleteJob = (id: string) => {
  const s = socketRef.current;
  if (!s) return;
  s.emit("job:delete", { id });
};

const sendDM = () => {

    const s = socketRef.current;
    if (!s || !text.trim() || !dmTo) return;
    s.emit("dm:send", { to: dmTo, text: text.trim() });
    setText("");
  };

  const openDM = (u: PresenceUser) => {
    setDmTo(u.id);
    setTab("chat");
  };

  const setMyPosFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const x = Math.max(0, Math.min(500, e.clientX - r.left));
    const y = Math.max(0, Math.min(300, e.clientY - r.top));

// portal hit test
const shops = (catalog?.shops || []) as any[];
const pts = shops.map((s, i) => ({ s, x: 80 + (i % 3) * 120, y: 90 + Math.floor(i / 3) * 110 }));
const hit = pts.find(p => Math.abs(x - p.x) < 58 && Math.abs(y - p.y) < 26);
if (hit) {
  setSelectedShop(hit.s as any);
  setToast(`入店: ${hit.s.name}`);
  setTimeout(() => setToast(""), 1200);
  return;
}
setPos({ x, y });
  };

  const rightPanel = (
  <div className="stack">
    <div className="card" style={{ padding: 12 }}>
      <div className="rowBetween">
        <div>
          <div className="title">名刺（ビジネスカード）</div>
          <div className="muted">PC強化の核：プロフィールを整えるほど提携が起きやすい</div>
        </div>
        <button className="btn" onClick={saveProfile} disabled={!authed}>名刺保存</button>
      </div>

      <div style={{ marginTop: 10 }} className="stack">
        <label className="muted">会社名 / 屋号</label>
        <input value={myCompany} onChange={(e) => setMyCompany(e.target.value)} placeholder="例）REALIA合同会社 / 福翔工務店" />

        <label className="muted">肩書き / 役割</label>
        <input value={myTitle} onChange={(e) => setMyTitle(e.target.value)} placeholder="例）代表 / 営業 / デザイナー / 施工管理" />

        <label className="muted">タグ（得意領域）</label>
        <input value={myTags} onChange={(e) => setMyTags(e.target.value)} placeholder="例）外壁塗装, 防水, Web制作, 集客" />

        <label className="muted">対応エリア</label>
        <input value={myRegion} onChange={(e) => setMyRegion(e.target.value)} placeholder="例）東北 / 福島 / 全国対応" />

        <label className="muted">Webサイト</label>
        <input value={myWebsite} onChange={(e) => setMyWebsite(e.target.value)} placeholder="https://..." />
      </div>
    </div>

    <div className="card" style={{ padding: 12 }}>
      <div className="rowBetween">
        <div>
          <div className="title">相手の名刺</div>
          <div className="muted">ユーザーを選択（オンライン一覧/近くの人/DM）</div>
        </div>
        <span className="pill">{selectedUser ? "選択中" : "未選択"}</span>
      </div>

      {!selectedUser ? (
        <div className="muted" style={{ marginTop: 10 }}>まだ相手が選ばれていません</div>
      ) : (
        <div style={{ marginTop: 10 }} className="stack">
          <div className="rowBetween">
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedUser.name}
              </div>
              <div className="muted">
                {selectedUser.company || "（会社未設定）"} / {selectedUser.title || "（役割未設定）"}
              </div>
            </div>
            <div>{statusPill(selectedUser.status || "available")}</div>
          </div>

          <div className="muted">タグ: {selectedUser.tags || "—"}</div>
          <div className="muted">対応: {selectedUser.region || "—"}</div>
          {selectedUser.website ? (
            <a href={selectedUser.website} target="_blank" rel="noreferrer">Webを見る</a>
          ) : (
            <div className="muted">Web: —</div>
          )}

          <label className="muted">提携メッセージ（任意）</label>
          <textarea value={partnerNote} onChange={(e) => setPartnerNote(e.target.value)} placeholder="例）共同受注の相談をしたいです。外壁塗装の集客で提携できませんか？" />
          <button className="btn" onClick={sendPartnerRequest} disabled={!authed || !selectedUserId}>提携申請</button>
        </div>
      )}
    </div>

    <div className="card" style={{ padding: 12 }}>
      <div className="rowBetween">
        <div>
          <div className="title">提携受信箱</div>
          <div className="muted">届いた申請がここに表示されます（MVP）</div>
        </div>
        <span className="pill">{partnerInbox.length}</span>
      </div>

      <label className="muted" style={{ marginTop: 10 }}>提案検索</label>
                <input value={propSearch} onChange={(e) => setPropSearch(e.target.value)} placeholder="キーワード（会社/名前/内容）" />
                <div style={{ marginTop: 10, maxHeight: 220, overflow: "auto" }} className="stack">
        {partnerInbox.length === 0 ? (
          <div className="muted">まだ届いていません</div>
        ) : (
          partnerInbox.map((p) => (
            <div key={p.id} className="msg">
              <div className="meta">
                <div>{p.from.name}（{p.from.company || "会社未設定"}）</div>
                <div>{fmtTime(p.ts)}</div>
              </div>
              <div className="muted">{p.from.title || ""} / {p.from.tags || ""}</div>
              <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{p.note || "（メッセージなし）"}</div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn btnSecondary" onClick={() => { const sid = dmSocketForUserId(p.from.userId); if (!sid) { setToast("相手がオンラインではありません"); setTimeout(() => setToast(""), 2600); return; } openDM({ id: sid, userId: p.from.userId, name: p.from.name, x: 0, y: 0, status: "available" } as any); }}>
                  DMへ
                </button>
                {p.from.website ? (
                  <a className="btn btnSecondary" href={p.from.website} target="_blank" rel="noreferrer">Web</a>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>

    <div className="card" style={{ padding: 12 }}>
      <div className="rowBetween">
        <div>
          <div className="title">案件ボード（共同受注）</div>
          <div className="muted">“提携が成立する”ためのPC強化機能</div>
        </div>
        <button className="btn btnSecondary" onClick={() => socketRef.current?.emit("job:request_list")}>更新</button>
      </div>

      <div style={{ marginTop: 10 }} className="stack">
        <label className="muted">案件タイトル</label>
        <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="例）外壁塗装の下請け協力（福島）" />
        <label className="muted">詳細</label>
        <textarea value={jobDetail} onChange={(e) => setJobDetail(e.target.value)} placeholder="例）2棟分。足場あり。見積もり協力できる方。" />
        <div className="row">
          <div style={{ flex: 1 }}>
            <label className="muted">予算/単価</label>
            <input value={jobBudget} onChange={(e) => setJobBudget(e.target.value)} placeholder="例）応相談 / 60万〜" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="muted">タグ</label>
            <input value={jobTags} onChange={(e) => setJobTags(e.target.value)} placeholder="例）外壁, 防水, 足場" />
          </div>
        </div>
        <button className="btn" onClick={createJob} disabled={!authed || !jobTitle.trim()}>投稿</button>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
    <div style={{ flex: 1 }}>
      <label className="muted">案件検索</label>
      <input value={jobQuery} onChange={(e) => setJobQuery(e.target.value)} placeholder="キーワード（例：福島 / 足場 / 防水）" />
    </div>
    <div style={{ flex: 1 }}>
      <label className="muted">タグ絞り込み</label>
      <input value={jobFilterTag} onChange={(e) => setJobFilterTag(e.target.value)} placeholder="例：外壁" />
    </div>
  </div>
  <div className="row">
    <div style={{ flex: 1 }}>
      <label className="muted">地域っぽい語</label>
      <input value={jobFilterRegion} onChange={(e) => setJobFilterRegion(e.target.value)} placeholder="例：東北 / 東京" />
    </div>
    <div style={{ flex: 1 }} />
  </div>

  <div style={{ marginTop: 12, maxHeight: 240, overflow: "auto" }} className="stack">
        {jobs.length === 0 ? (
          <div className="muted">まだ案件がありません</div>
        ) : (
          jobs.filter((j) => {
              const q = jobQuery.trim().toLowerCase();
              const tag = jobFilterTag.trim().toLowerCase();
              const reg = jobFilterRegion.trim().toLowerCase();
              const hay = `${j.title} ${j.detail} ${j.tags} ${j.budget} ${j.ownerName}`.toLowerCase();
              if (q && !hay.includes(q)) return false;
              if (tag && !String(j.tags || "").toLowerCase().includes(tag)) return false;
              if (reg && !(String(j.detail || "").toLowerCase().includes(reg) || String(j.tags || "").toLowerCase().includes(reg))) return false;
              return true;
            }).map((j) => (
            <div key={j.id} className="msg">
              <div className="meta">
                <div>{j.title}</div>
                <div>{fmtTime(j.ts)}</div>
              </div>
              <div className="muted">投稿者: {j.ownerName} / 予算: {j.budget || "—"} / {j.tags || ""}</div>
              <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{j.detail}</div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn btnSecondary" onClick={() => { setSelectedUserId(j.ownerId); const sid = dmSocketForUserId(j.ownerId); if (!sid) { setToast("投稿者がオンラインではありません"); setTimeout(() => setToast(""), 2600); return; } openDM({ id: sid, userId: j.ownerId, name: j.ownerName, x: 0, y: 0, status: "available" } as any); }}>
                  投稿者にDM
                </button>
                {me?.id === j.ownerId && (
                  <button className="btn btnDanger" onClick={() => deleteJob(j.id)}>削除</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);


      const leftPanel = (
    <div className="stack">
      <div className="card" style={{ padding: 12 }}>
        <div className="rowBetween">
          <div>
            <div className="title">REALIA Fashion β (Browser)</div>
            <div className="muted">近未来・六本木風の雰囲気チェック（AI接客＋購入モック）</div>
          </div>
          <span className="pill">v3.0</span>
        </div>

        {!authed ? (
          <div style={{ marginTop: 12 }} className="stack">
            <label className="muted">表示名（ゲスト）</label>
            <input
              placeholder="例）宗一郎"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="btn" onClick={onJoin} disabled={!name.trim()}>
              入室
            </button>
            <div className="muted">
              ※別ブラウザ/シークレットで2人以上にすると「近くの人」「DM」が確認できます。
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 12 }} className="stack">
            <div className="rowBetween">
              <div className="muted">接続先</div>
              <a href={BACKEND_URL} target="_blank" rel="noreferrer">{BACKEND_URL}</a>
            </div>
            <div className="rowBetween">
              <div className="muted">オンライン</div>
              <div style={{ fontWeight: 800 }}>{presence.length}</div>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 12 }}>
  <div className="rowBetween">
    <div>
      <div className="title">Roppongi Neo / Fashion District</div>
      <div className="muted">AIモードで雰囲気確認 →（将来）LIVEで人の買い物空間へ</div>
    </div>
    <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <button className={`btn btnSecondary`} onClick={() => {
        setWorldMode((m) => {
          const next = m === "AI" ? "LIVE" : "AI";
          if (next === "LIVE") {
            setToast("LIVEモードは次フェーズで解放予定（βではAIのみ）");
            setTimeout(() => setToast(""), 2500);
            return "AI";
          }
          return next;
        });
      }}>{worldMode === "AI" ? "AI MODE" : "LIVE MODE"}</button>
      <button className={`btn btnSecondary`} onClick={() => setCameraMode((c) => (c === "3RD" ? "1ST" : "3RD"))}>
        {cameraMode === "3RD" ? "👤 3rd" : "👁 1st"}
      </button>
      <button className="btn" onClick={() => {
        const s = socketRef.current;
        if (s) s.emit("notifications:list", {});
        setToast("通知を更新しました");
        setTimeout(() => setToast(""), 1200);
      }}>通知更新</button>
    </div>
  </div>
  <div style={{ marginTop: 10 }} className="row" style={{ gap: 8, flexWrap: "wrap" }}>
    <span className="pill">ホログラム広告: 3種（景観に馴染む配置）</span>
    <span className="pill">接客: AI</span>
    <span className="pill">購入: モック</span>
  </div>
</div>

<div className="card mapWrap">
        <div className="rowBetween" style={{ marginBottom: 10 }}>
          <div className="title">ストリート（六本木風）</div>
          <div className="muted">タップで移動 / 店舗ホログラムをタップで入店</div>
        </div>
        <canvas
          className="map"
          ref={canvasRef}
          onPointerDown={setMyPosFromPointer}
          onPointerMove={(e) => { if (e.buttons === 1) setMyPosFromPointer(e); }}
        />
        <div className="muted" style={{ marginTop: 10 }}>
          ※六本木風ネオン＋ホログラム広告を表現（簡易） / ※WebGL/3Dは次フェーズ。まずは「出会い→DM→通話導線」の確認を優先。
        </div>

{selectedShop ? (
  <div className="card" style={{ padding: 12, marginTop: 12 }}>
    <div className="rowBetween">
      <div>
        <div className="title">🏬 {selectedShop.name}</div>
        <div className="muted">{selectedShop.tagline}</div>
      </div>
      <button className="btn btnSecondary" onClick={() => setSelectedShop(null)}>閉じる</button>
    </div>

    <div style={{ marginTop: 10 }} className="row" style={{ gap: 8, flexWrap: "wrap" }}>
      {(selectedShop.style || []).map((t) => <span key={t} className="pill">{t}</span>)}
      <span className="pill">AI接客</span>
    </div>

    <div style={{ marginTop: 12 }} className="stack">
  <div className="card" style={{ padding: 10, background: "rgba(255,255,255,.03)" }}>
    <div className="rowBetween">
      <div>
        <div style={{ fontWeight: 900 }}>👤 アバター試着プレビュー</div>
        <div className="muted">{tryOnName ? `着用中: ${tryOnName}` : "まだ試着していません（商品で「試着」を押してください）"}</div>
      </div>
      <button className="btn btnSecondary" disabled={!tryOnName} onClick={() => { setTryOnSku(''); setTryOnName(''); }}>脱ぐ</button>
    </div>
    <div style={{ marginTop: 10, height: 78, borderRadius: 14, background: "linear-gradient(90deg, rgba(74,163,255,.18), rgba(153,255,204,.10), rgba(255,215,128,.12))", border: "1px solid rgba(255,255,255,.10)" }} />
    <div className="muted" style={{ marginTop: 6 }}>※βでは見た目の雰囲気確認用（実3D試着はアプリ移行で強化）</div>
  </div>

      {shopStep === "talk" ? (
                <div>
              <div className="muted">AI店員（デモ）</div>
      <div className="card" style={{ padding: 10, background: "rgba(255,255,255,.04)" }}>
        <div style={{ fontWeight: 800 }}>🤖 店員AI</div>
        <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
          いらっしゃいませ。{selectedShop.name}です。

          「用途」「予算」「好み（ストリート/ミニマル/ラグジュアリー）」を教えてください。

          ※βでは雰囲気確認用のモックです。
        </div>
      </div>

      <div className="rowBetween">
        <div className="muted">おすすめ（ダミー商品）</div>
        <button className="btn btnSecondary" onClick={() => setCart([])}>カートを空に</button>
      </div>

      {(selectedShop.featured || []).map((p) => (
        <div key={p.sku} className="card" style={{ padding: 10 }}>
          <div className="rowBetween">
            <div>
              <div style={{ fontWeight: 900 }}>{p.name}</div>
              <div className="muted">{p.desc}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 900 }}>¥{p.price}</div>
              <div className="row" style={{ gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
                        <button className="btn btnSecondary" onClick={() => { setTryOnSku(p.sku); setTryOnName(p.name); setToast(`試着: ${p.name}`); setTimeout(() => setToast(""), 1200); }}>試着</button>
                        <button className="btn" onClick={() => setCart((prev) => [...prev, p])}>カートに入れる</button>
                      </div>
            </div>
          </div>
        </div>
      ))}

      <div className="card" style={{ padding: 10 }}>
        <div className="rowBetween">
          <div>
            <div style={{ fontWeight: 900 }}>🛒 カート</div>
            <div className="muted">{cart.length}点 / 合計 ¥{cart.reduce((a, b) => a + (b.price || 0), 0)}</div>
          </div>
          <button className="btn" disabled={!cart.length} onClick={() => {
            const order = { id: `ORD-${Date.now()}`, items: cart, total: cart.reduce((a,b)=>a+(b.price||0),0), ts: Date.now(), shopId: selectedShop.id, shopName: selectedShop.name };
            setPurchased((prev) => [order, ...prev].slice(0, 50));
            setCart([]);
            setToast("注文（モック）を完了しました");
            setTimeout(() => setToast(""), 2000);
          }}>注文する（モック）</button>
        </div>
        {cart.length ? (
          <div className="muted" style={{ marginTop: 6 }}>
            {cart.map((x, i) => <span key={i} className="pill" style={{ marginRight: 6 }}>{x.name}</span>)}
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 6 }}>商品を追加するとここに表示されます</div>
        )}
      </div>

      <div className="card" style={{ padding: 10 }}>
        <div style={{ fontWeight: 900 }}>🧾 購入履歴（モック）</div>
        <div className="muted">βではローカル保存（端末内）</div>
        <div style={{ marginTop: 8 }} className="stack">
          {purchased.slice(0, 5).map((o) => (
            <div key={o.id} className="card" style={{ padding: 10, background: "rgba(255,255,255,.03)" }}>
              <div className="rowBetween">
                <div style={{ fontWeight: 800 }}>{o.shopName}</div>
                <div className="muted">¥{o.total}</div>
              </div>
              <div className="muted">{new Date(o.ts).toLocaleString()}</div>
            </div>
          ))}
          {!purchased.length ? <div className="muted">まだありません</div> : null}
        </div>
      </div>
    </div>
  </div>
) : null}


      </div>

      <div className="card" style={{ padding: 12 }}>
        <div className="title">オンライン一覧</div>
        <div className="muted" style={{ marginTop: 6 }}>
          クリックでDM開始（PCだと右ペインが使えます）
        </div>
        <div style={{ marginTop: 10, maxHeight: 240, overflow: "auto" }} className="stack">
          {others.length === 0 ? (
            <div className="muted">他のユーザーがいません</div>
          ) : (
            others.map((u) => (
              <div key={u.id} className="rowBetween" style={{ gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.name}
                  </div>
                  <div className="muted">
                    {Math.round(Math.hypot(u.x - pos.x, u.y - pos.y))}px / {u.status}
                  </div>
                </div>
                <button className="btn btnSecondary" onClick={() => openDM(u)}>DM</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const midPanel = (
    <div className="stack">
      <div className="card" style={{ padding: 12 }}>
        <div className="rowBetween">
          <div>
            <div className="title">チャット</div>
            <div className="muted">エリアチャット or 1対1 DM</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btnSecondary" onClick={() => setDmTo("")}>エリア</button>
            <button className="btn btnSecondary" onClick={() => {
              const s = socketRef.current;
              if (!s) return;
              s.emit("nearby:request", { radius });
            }}>近く更新</button>
          </div>
        </div>

        <div style={{ marginTop: 10 }} className="row">
          <div style={{ flex: 1 }}>
            {dmTo ? (
              <div className="muted">DM相手: {presence.find(p => p.id === dmTo)?.name || dmTo}</div>
            ) : (
              <div className="muted">エリア: {area}</div>
            )}
          </div>
          <button
            className="btn"
            onClick={() => {
              if (!dmTo) {
                // Quick "通話" placeholder (Phase1)
                alert("通話はPhase1では外部リンク方式にします。次は“会議室URL生成”を入れます。");
              } else {
                alert("DM相手との通話は、次に“会議室URL生成(外部)”を実装します。");
              }
            }}
          >
            通話（仮）
          </button>
        </div>
      </div>

      
{midMode === "requests" ? (
  <div className="stack">
    <div className="card" style={{ padding: 12 }}>
      <div className="rowBetween">
        <div>
          <div className="title">一般ユーザーの依頼（AIピックアップ）</div>
          <div className="muted">依頼→加盟店へ通知→提案が届く（MVP）</div>
        </div>
        <button className="btn btnSecondary" onClick={() => { const s = socketRef.current; if (s) { s.emit("request:list", { mine: true }); s.emit("request:list", { mine: false }); } }}>更新</button>
      </div>

      <div style={{ marginTop: 10 }} className="stack">
        <label className="muted">カテゴリ</label>
        <input value={reqCategory} onChange={(e) => setReqCategory(e.target.value)} placeholder="例）住宅塗装 / 引越し / Web制作" />
        <div className="row">
          <div style={{ flex: 1 }}>
            <label className="muted">予算上限（円）</label>
            <input value={reqBudgetMax} onChange={(e) => setReqBudgetMax(e.target.value)} placeholder="1000000" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="muted">場所</label>
            <input value={reqLocation} onChange={(e) => setReqLocation(e.target.value)} placeholder="例）福島市 / 東京都" />
          </div>
        </div>
        <label className="muted">ニーズ（任意）</label>
        <input value={reqNeeds} onChange={(e) => setReqNeeds(e.target.value)} placeholder="例）自社施工, 保証, 早め" />
        <label className="muted">依頼文</label>
        <textarea value={reqText} onChange={(e) => setReqText(e.target.value)} placeholder="例）100万円で戸建ての外壁塗装をしたい。福島市。できれば自社施工。" />
        <button
          className="btn"
          onClick={() => {
            const s = socketRef.current;
            if (!s) return;
            s.emit("request:create", {
              text: reqText,
              category: reqCategory,
              budgetMax: Number(reqBudgetMax || 0),
              locationText: reqLocation,
              needs: reqNeeds,
            });
            setReqText("");
            setToast("依頼を送信しました");
            setTimeout(() => setToast(""), 2600);
          }}
          disabled={!authed || !reqText.trim()}
        >
          依頼を送る
        </button>
<div className="card" style={{ padding: 12, marginTop: 12 }}>
  <div className="rowBetween">
    <div>
      <div className="title">通知箱（オフライン対応）</div>
      <div className="muted">依頼通知・提案通知がここに残ります</div>
    </div>
    <button className="btn btnSecondary" onClick={() => socketRef.current?.emit("notif:list")}>更新</button>
  </div>
  <label className="muted" style={{ marginTop: 10 }}>通知検索</label>
  <input value={notifSearch} onChange={(e) => setNotifSearch(e.target.value)} placeholder="キーワード（カテゴリ/場所/本文）" />
  <div style={{ marginTop: 10, maxHeight: 260, overflow: "auto" }} className="stack">
    {notifs
      .filter((n) => {
        const q = notifSearch.trim().toLowerCase();
        if (!q) return true;
        const hay = `${n.kind} ${JSON.stringify(n.payload || {})}`.toLowerCase();
        return hay.includes(q);
      })
      .map((n) => (
        <div key={n.notif_id} className="msg">
          <div className="meta"><div>{n.kind}</div><div>{fmtTime(n.ts)}</div></div>
          <div style={{ marginTop: 6 }}>{renderNotif(n)}</div>
          {!n.read ? (
            <button className="btn btnSecondary" onClick={() => { socketRef.current?.emit("notif:read", { id: n.notif_id }); socketRef.current?.emit("notif:list"); }}>既読にする</button>
          ) : null}
        </div>
      ))}
    {notifs.length === 0 ? <div className="muted">まだありません</div> : null}
  </div>
</div>

<div className="card" style={{ padding: 12, marginTop: 12 }}>
  <div className="rowBetween">
    <div>
      <div className="title">加盟店申請（営業したい方向け）</div>
      <div className="muted">申請→運営承認後、加盟店モードで提案が可能になります</div>
    </div>
    <button className="btn" onClick={() => {
      const s = socketRef.current;
      if (!s) return;
      s.emit("member:apply", { company: appCompany, phone: appPhone, categories: appCats, region: appRegion });
      setToast("加盟店申請を送信しました");
      setTimeout(() => setToast(""), 2600);
    }}>申請する</button>
  </div>
  <div style={{ marginTop: 10 }} className="stack">
    <label className="muted">会社名 / 屋号</label>
    <input value={appCompany} onChange={(e) => setAppCompany(e.target.value)} placeholder="例）福翔工務店" />
    <label className="muted">電話</label>
    <input value={appPhone} onChange={(e) => setAppPhone(e.target.value)} placeholder="例）024-597-8797" />
    <label className="muted">対応カテゴリ</label>
    <input value={appCats} onChange={(e) => setAppCats(e.target.value)} placeholder="例）住宅塗装, 防水, リフォーム" />
    <label className="muted">対応エリア（都道府県）</label>
    <input value={appRegion} onChange={(e) => setAppRegion(e.target.value)} placeholder="対応エリア（例：福島県、宮城県）" />
    <div className="card" style={{ padding: 10, marginTop: 8 }}>
      <div className="muted">都道府県を選択（複数可）</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, maxHeight: 160, overflow: "auto" }}>
        {PREFS.map((p) => {
          const selected = (appRegion || "").split(/[、,\n\r\t ]+/).map(s=>s.trim()).filter(Boolean);
          const on = selected.includes(p);
          return (
            <label key={p} className="pill" style={{ cursor: "pointer", opacity: on ? 1 : 0.7 }}>
              <input type="checkbox" checked={on} onChange={() => {
                const next = new Set(selected);
                if (next.has(p)) next.delete(p); else next.add(p);
                setAppRegion(Array.from(next).join("、"));
              }} />
              <span style={{ marginLeft: 6 }}>{p}</span>
            </label>
          );
        })}
      </div>
    </div>
  </div>
</div>


      </div>
    </div>

    <div className="card" style={{ padding: 12 }}>
      <div className="rowBetween">
        <div className="title">あなたの依頼</div>
        <span className="pill">{myRequests.length}</span>
      </div>
      <label className="muted" style={{ marginTop: 10 }}>提案検索</label>
                <input value={propSearch} onChange={(e) => setPropSearch(e.target.value)} placeholder="キーワード（会社/名前/内容）" />
                <div style={{ marginTop: 10, maxHeight: 220, overflow: "auto" }} className="stack">
        {myRequests.length === 0 ? (
          <div className="muted">まだありません</div>
        ) : (
          myRequests.map((r) => (
            <div key={r.request_id} className="msg" data-reqid={r.request_id} ref={(el) => { if (el && focusRequestId && focusRequestId === r.request_id) { try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {} setTimeout(() => setFocusRequestId(""), 800); } }}>
              <div className="meta"><div>{r.category || "依頼"}</div><div>{fmtTime(r.ts)}</div></div>
              <div className="muted">予算: {r.budget_max || "—"} / 場所: {r.location_text || "—"} / ニーズ: {r.needs || "—"}</div>
              <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{r.text}</div>
                          {negotiationRooms[r.request_id] ? (
                            <div style={{ marginTop: 6 }}>
                              <a href={negotiationRooms[r.request_id]} target="_blank" rel="noreferrer">交渉ルームを開く</a>
                            </div>
                          ) : (
                            <button className="btn btnSecondary" style={{ marginTop: 6 }} onClick={() => openNegotiation(r.request_id)}>交渉ルーム</button>
                          )}
                        <div className="muted" style={{ marginTop: 6 }}>status: {r.status || "open"}</div>
                        <div className="row" style={{ marginTop: 10, gap: 8 }}>
                          <button className="btn btnSecondary" onClick={() => openNegotiation(r.request_id)}>交渉ルーム</button>
                          <button className="btn btnSecondary" onClick={() => socketRef.current?.emit("request:close", { requestId: r.request_id, status: "closed" })}>クローズ</button>
                          <button className="btn btnSecondary" onClick={() => socketRef.current?.emit("request:close", { requestId: r.request_id, status: "cancelled" })}>キャンセル</button>
                        </div>
            </div>
          ))
        )}
      </div>
    </div>

    <div className="card" style={{ padding: 12 }}>
      <div className="rowBetween">
        <div className="title">届いた提案</div>
        <span className="pill">{proposals.length}</span>
      </div>
      <label className="muted" style={{ marginTop: 10 }}>提案検索</label>
                <input value={propSearch} onChange={(e) => setPropSearch(e.target.value)} placeholder="キーワード（会社/名前/内容）" />
                <div style={{ marginTop: 10, maxHeight: 220, overflow: "auto" }} className="stack">
        {proposals.length === 0 ? (
          <div className="muted">まだ届いていません</div>
        ) : (
          proposals.filter((p) => {
                      const q = propSearch.trim().toLowerCase();
                      if (!q) return true;
                      const hay = `${p.from_name} ${p.message} ${p.status}`.toLowerCase();
                      return hay.includes(q);
                    }).map((p) => (
            <div key={p.proposal_id} className="msg" data-propid={p.proposal_id} ref={(el) => { if (el && focusProposalId && focusProposalId === p.proposal_id) { try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {} setTimeout(() => setFocusProposalId(""), 800); } }}>
              <div className="meta"><div>{p.from_name}</div><div>{fmtTime(p.ts)}</div></div>
              <div style={{ whiteSpace: "pre-wrap" }}>{p.message}</div>
                        <div className="muted" style={{ marginTop: 6 }}>status: {p.status || "sent"}</div>
                        <div className="row" style={{ marginTop: 10, gap: 8 }}>
                          <button className="btn" onClick={() => socketRef.current?.emit("proposal:respond", { proposalId: p.proposal_id, action: "accept" })}>採用（交渉へ）</button>
                          <button className="btn btnSecondary" onClick={() => socketRef.current?.emit("proposal:respond", { proposalId: p.proposal_id, action: "reject" })}>見送り</button>
                        </div>
            </div>
          ))
        )}
      </div>
    </div>

    {role === "member" && (
      <div className="card" style={{ padding: 12 }}>
        <div className="rowBetween">
          <div>
            <div className="title">加盟店設定（マッチング用）</div>
            <div className="muted">カテゴリ/価格帯を登録するとピックアップされやすい（提案には運営承認が必要）</div>
          </div>
          <button className="btn" onClick={() => { const s = socketRef.current; if (!s) return; s.emit("member:update_settings", { categories: memberCats, priceMin: Number(memberPriceMin||0), priceMax: Number(memberPriceMax||0) }); }}>保存</button>
        </div>
        <div style={{ marginTop: 10 }} className="stack">
          <label className="muted">対応カテゴリ（カンマ区切り）</label>
          <input value={memberCats} onChange={(e) => setMemberCats(e.target.value)} placeholder="例）住宅塗装, 防水, リフォーム" />
          <div className="row">
            <div style={{ flex: 1 }}>
              <label className="muted">最低価格（円）</label>
              <input value={memberPriceMin} onChange={(e) => setMemberPriceMin(e.target.value)} placeholder="800000" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="muted">最高価格（円）</label>
              <input value={memberPriceMax} onChange={(e) => setMemberPriceMax(e.target.value)} placeholder="1500000" />
            </div>
          </div>
        </div>

        <div className="rowBetween" style={{ marginTop: 12 }}>
          
<div className="card" style={{ padding: 12, marginTop: 12 }}>
  <div className="title">加盟店ダッシュボード</div>
  <div className="muted">自分の提案状況（採用率）</div>
  <div style={{ marginTop: 8 }}>
    <button className="btn btnSecondary" onClick={() => socketRef.current?.emit("member:stats")}>更新</button>
  </div>
  {memberStats ? (
    <div style={{ marginTop: 10 }} className="stack">
      <div>提案総数: <b>{memberStats.total}</b></div>
      <div>採用数: <b>{memberStats.accepted}</b></div>
      <div>採用率: <b>{(Number(memberStats.rate || 0) * 100).toFixed(1)}%</b></div>
      <div className="muted">内訳: {JSON.stringify(memberStats.by || {})}</div>
                          {Array.isArray(memberStats.byCategory) && memberStats.byCategory.length ? (
                            <div style={{ marginTop: 10 }}>
                              <div className="muted">カテゴリ別（採用/総数）</div>
                              <div style={{ overflowX: "auto" }}>
                                <table className="table" style={{ width: "100%", marginTop: 6 }}>
                                  <thead>
                                    <tr>
                                      <th>category</th>
                                      <th style={{ textAlign: "right" }}>total</th>
                                      <th style={{ textAlign: "right" }}>accepted</th>
                                      <th style={{ textAlign: "right" }}>rate</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {memberStats.byCategory.map((r: any) => (
                                      <tr key={String(r.category)}>
                                        <td>{String(r.category)}</td>
                                        <td style={{ textAlign: "right" }}>{Number(r.total || 0)}</td>
                                        <td style={{ textAlign: "right" }}>{Number(r.accepted || 0)}</td>
                                        <td style={{ textAlign: "right" }}>{(Number(r.rate || 0) * 100).toFixed(1)}%</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : null}
    </div>
  ) : (
    <div className="muted" style={{ marginTop: 10 }}>（まだデータがありません）</div>
  )}
</div>

<div className="title">加盟店向け：最新の依頼</div>
          <span className="pill">{requests.length}</span>
        </div>
        <div style={{ marginTop: 10, maxHeight: 260, overflow: "auto" }} className="stack">
          {requests.length === 0 ? (
            <div className="muted">まだありません</div>
          ) : (
            requests.filter((r) => {
                      const q = reqSearch.trim().toLowerCase();
                      const cat = reqFilterCategory.trim().toLowerCase();
                      const loc = reqFilterLocation.trim().toLowerCase();
                      const bmax = Number(reqFilterBudgetMax || 0);
                      const stf = reqFilterStatus.trim().toLowerCase();
                      if (stf && String(r.status||"open").toLowerCase() !== stf) return false;
                      if (onlyAreaMatch && Number((r as any).matchScore || 0) < 2) return false;
                      if (cat && String(r.category||"").toLowerCase().indexOf(cat) === -1) return false;
                      if (loc && String(r.location_text||"").toLowerCase().indexOf(loc) === -1) return false;
                      if (bmax && Number(r.budget_max||0) > bmax) return false;
                      if (!q) return true;
                      const hay = `${r.requester_name} ${r.category} ${r.location_text} ${r.needs} ${r.text}`.toLowerCase();
                      return hay.includes(q);
                    }).map((r) => (
              <div key={r.request_id} className="msg">
                <div className="meta"><div>{r.requester_name}</div><div>{fmtTime(r.ts)}</div></div>
                <div style={{ fontWeight: 900 }}>{r.category || "依頼"}</div>
                <div className="muted">予算: {r.budget_max || "—"} / 場所: {r.location_text || "—"} / ニーズ: {r.needs || "—"}</div>
                <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{r.text}</div>
                        <div className="muted" style={{ marginTop: 6 }}>status: {r.status || "open"}</div>
                        <div className="row" style={{ marginTop: 10, gap: 8 }}>
                          <button className="btn btnSecondary" onClick={() => openNegotiation(r.request_id)}>交渉ルーム</button>
                          <button className="btn btnSecondary" onClick={() => socketRef.current?.emit("request:close", { requestId: r.request_id, status: "closed" })}>クローズ</button>
                          <button className="btn btnSecondary" onClick={() => socketRef.current?.emit("request:close", { requestId: r.request_id, status: "cancelled" })}>キャンセル</button>
                        </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button
                    className="btn"
                    onClick={() => {
                      const s = socketRef.current;
                      if (!s) return;
                      const msg = prompt("提案文（そのまま送信）", `【ご提案】${r.category || "ご相談"}について、詳細を伺ってお見積り可能です。\nREALIA上で通話/チャットいかがでしょうか？`) || "";
                      if (!msg.trim()) return;
                      if (!isApprovedMember) { setToast("加盟店は運営承認（approved）が必要です"); setTimeout(() => setToast(""), 2600); return; }
                                s.emit("proposal:send", { requestId: r.request_id, message: msg });
                      setToast("提案を送信しました");
                      setTimeout(() => setToast(""), 2600);
                    }}
                  >
                    提案する
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )}
  </div>
) : (

<div className="card messages">
        {(dmTo ? dmMsgs.filter(m => m.from.id === dmTo || m.to === dmTo) : areaMsgs.filter(m => m.area === area))
          .slice(-100)
          .map((m) => (
            <div key={m.id} className="msg">
              <div className="meta">
                <div>{m.from.name}{m.kind === "area" ? ` @${(m as any).area}` : ""}</div>
                <div>{fmtTime(m.ts)}</div>
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
            </div>
          ))}
        {((dmTo ? dmMsgs.filter(m => m.from.id === dmTo || m.to === dmTo) : areaMsgs.filter(m => m.area === area)).length === 0) && (
          <div className="muted">まだメッセージがありません</div>
        )}
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div className="row" style={{ alignItems: "stretch" }}>
          <textarea
            placeholder={dmTo ? "DMを入力…" : "エリアに投稿…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="stack" style={{ minWidth: 140 }}>
            <button className="btn" onClick={dmTo ? sendDM : sendArea} disabled={!authed || !text.trim()}>
              送信
            </button>
            <button
              className="btn btnSecondary"
              onClick={() => setText("")}
              disabled={!text}
            >
              クリア
            </button>
            {dmTo && (
              <button className="btn btnDanger" onClick={() => setDmTo("")}>
                DM終了
              </button>
            )}
          </div>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          ※PCは3ペイン、スマホは下部タブで操作（このMVPの想定）
        </div>
      </div>
    </div>
  );

  // mobile tab visibility
  const leftHidden = (window.innerWidth <= 980) && tab !== "map";
  const midHidden = (window.innerWidth <= 980) && tab !== "chat";
  const rightHidden = (window.innerWidth <= 980) && tab !== "people";

  return (
    <div className="app">
          {toast && (
            <div style={{ position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 9999 }} role="status">
              <div className="card" style={{ padding: "10px 12px", borderRadius: 999, background: "rgba(16,29,58,.92)" }}>
                <div style={{ fontWeight: 800 }}>{toast}</div>
              </div>
            </div>
          )}
      <div className={`left ${leftHidden ? "panelHidden" : ""}`}>{leftPanel}</div>
      <div className={`mid ${midHidden ? "panelHidden" : ""}`}>{midPanel}</div>
      <div className={`right ${rightHidden ? "panelHidden" : ""}`}>{rightPanel}</div>

      <div className="tabs">
        <button className={`tabBtn ${tab === "map" ? "active" : ""}`} onClick={() => setTab("map")}>
          マップ
        </button>
        <button className={`tabBtn ${tab === "chat" ? "active" : ""}`} onClick={() => setTab("chat")}>
          チャット
        </button>
        <button className={`tabBtn ${tab === "people" ? "active" : ""}`} onClick={() => setTab("people")}>
          人
        </button>
      </div>
    </div>
  );
}

s.on("proposal:list", (list: any[]) => {
  const norm = (list || []).map((p) => ({
    proposal_id: p.proposal_id,
    request_id: p.request_id,
    from_user_id: p.from_user_id,
    from_name: p.from_name,
    to_user_id: p.to_user_id,
    message: p.message,
    ts: Number(p.ts || 0),
    status: p.status || "sent",
  }));
  // mine=true list is proposals received (to_user_id == me.userId)
  setProposals(norm.filter((x) => x.to_user_id === (me?.userId || "")));
  // mine=false list is proposals sent by me (from_user_id == me.userId)
  setSentProposals(norm.filter((x) => x.from_user_id === (me?.userId || "")));
});

s.on("proposal:status", (p: any) => {
  const pid = String(p.proposal_id || "");
  const st = String(p.status || "");
  const roomUrl = String(p.room_url || "");
  setProposals((prev) => prev.map(x => x.proposal_id === pid ? { ...x, status: st, room_url: (p.room_url || x.room_url) } : x));
  setSentProposals((prev) => prev.map(x => x.proposal_id === pid ? { ...x, status: st, room_url: (p.room_url || x.room_url) } : x));

  if (st === "accepted") {
    if (roomUrl) setLastRoomUrl(roomUrl);
    setToast("提案が採用されました（交渉へ）");
    setTimeout(() => setToast(""), 2600);
    // auto-open DM with accepted member (if I'm requester)
    const memberUserId = String(p.from_user_id || "");
    const sid = presence.find(x => String(x.userId || "") === memberUserId)?.id || "";
    if (sid) {
      setDmTo(sid);
      setSelectedUserId(memberUserId);
      setTab("chat");
    }
  }
});

s.on("notif:list", (list: any[]) => {
  setNotifs(list || []);
});

s.on("member:stats", (payload: any) => {
  setMemberStats(payload);
});

s.on("request:status", (r: any) => {
  const rid = String(r.request_id || "");
  const st = String(r.status || "");
  setMyRequests((prev) => prev.map(x => x.request_id === rid ? { ...x, status: st } : x));
  setRequests((prev) => prev.map(x => x.request_id === rid ? { ...x, status: st } : x));
});

s.on("proposal:blocked", (payload: any) => {
  const until = payload?.exclusive_until ? new Date(payload.exclusive_until).toLocaleString() : "";
  setToast(until ? `優先枠のため提案できません（${until}まで）` : "優先枠のため提案できません");
  setTimeout(() => setToast(""), 3000);
});
type Product = { sku: string; name: string; price: number; desc?: string };
type Shop = { id: string; name: string; tagline?: string; style?: string[]; holo?: string; featured?: Product[] };


      tRef.current += 1;
      const t = tRef.current;
// draw Event Square (space-only for now)
ctx.save();
ctx.globalAlpha = 1;
ctx.strokeStyle = "rgba(255,255,255,.10)";
ctx.lineWidth = 1;
(ctx as any).roundRect(eventSquare.x-eventSquare.w/2, eventSquare.y-eventSquare.h/2, eventSquare.w, eventSquare.h, 14);
ctx.stroke();

// stage hologram
const sx = eventSquare.x;
const sy = eventSquare.y;
ctx.fillStyle = "rgba(74,163,255,.10)";
(ctx as any).roundRect(sx-44, sy-18, 88, 36, 12);
ctx.fill();
ctx.strokeStyle = "rgba(74,163,255,.35)";
ctx.lineWidth = 2;
(ctx as any).roundRect(sx-44, sy-18, 88, 36, 12);
ctx.stroke();

// hologram beams on stage
for (let i=0;i<3;i++){
  const x = sx - 20 + i*20 + Math.sin((t+i)*0.08)*2;
  const g = ctx.createLinearGradient(x, sy-70, x, sy-10);
  g.addColorStop(0, "rgba(153,255,204,.00)");
  g.addColorStop(0.5, "rgba(153,255,204,.22)");
  g.addColorStop(1, "rgba(153,255,204,.00)");
  ctx.fillStyle = g;
  ctx.fillRect(x-6, sy-70, 12, 60);
}

ctx.fillStyle = "rgba(255,255,255,.75)";
ctx.font = "900 10px ui-sans-serif, system-ui";
ctx.fillText("EVENT SQUARE", eventSquare.x-56, eventSquare.y+eventSquare.h/2 + 18);
ctx.globalAlpha = 0.55;
ctx.font = "700 9px ui-sans-serif, system-ui";
ctx.fillText("LIVE (next phase)", eventSquare.x-56, eventSquare.y+eventSquare.h/2 + 32);
ctx.restore();

