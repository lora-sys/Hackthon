"use client";

import type { AgentCard } from "@wishlive/shared";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { WalletConnectButton } from "../../components/wallet-connect-button";
import { useWalletAccount } from "../providers";

type Role = "audience" | "musician" | "venue";
type FormState = {
  displayName: string;
  city: string;
  genres: string[];
  formats: string[];
  timeSlots: string[];
  instruments: string[];
  experience: string;
  memberCount: string;
  venueName: string;
  capacity: string;
  venueType: string;
  facilities: string;
  publishedWorks: string;
};

const initialForm: FormState = {
  displayName: "",
  city: "shanghai",
  genres: ["rock", "indie"],
  formats: ["Live House", "Emerging Artist"],
  timeSlots: ["Weeknight", "Weekend Night"],
  instruments: ["Guitar"],
  experience: "6-20",
  memberCount: "4",
  venueName: "",
  capacity: "240",
  venueType: "Livehouse",
  facilities: "PA, lighting, small stage, bar",
  publishedWorks: ""
};

const roleSteps = {
  audience: ["身份认证", "个人偏好", "推荐预览", "完成"],
  musician: ["身份认证", "个人偏好", "作品与经历", "预览", "完成"],
  venue: ["身份认证", "场地信息", "场地设备", "过往演出", "资质上传", "完成"]
} as const;

export default function CreateAgentPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#05050a] text-white">Loading...</main>}>
      <CreateAgentContent />
    </Suspense>
  );
}

function CreateAgentContent() {
  const searchParams = useSearchParams();
  const initialRole = parseRole(searchParams.get("role"));
  const { address, isConnected } = useWalletAccount();
  const [role, setRole] = useState<Role>(initialRole);
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const card = useMemo(() => buildAgentCard(role, form, address), [address, form, role]);
  const steps = roleSteps[role];

  async function submit() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/contracts/register-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card)
      });
      const body = (await response.json()) as Record<string, unknown> & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Agent registration failed");
      }
      setResult(body);
      window.localStorage.setItem("wishlive:lastAgentId", card.agent_id);
      window.localStorage.setItem("wishlive:lastRole", role);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Agent registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="wl-grid min-h-screen bg-[#05050a] text-white">
      <div className="flex min-h-screen">
        <aside className="wl-identity-sidebar">
          <div className="text-3xl font-black">WishLive</div>
          <div className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#d49aff]">{role}</div>
          <nav className="mt-16 grid gap-7">
            {steps.map((step, index) => (
              <button
                className={index === 0 ? "wl-step wl-step-active" : "wl-step"}
                key={step}
                type="button"
              >
                <span>{String(index + 1).padStart(2, "0")} {step}</span>
                <small>{englishStep(step)}</small>
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-xs font-bold text-white/48">
            您的信息将被安全加密，仅用于个性化推荐和 AgentCard 上链。
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-8 py-12 xl:px-16">
          <header className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.36em] text-[#d49aff]">
                01 / Identity Verification
              </p>
              <h1 className="mt-7 text-5xl font-black tracking-tight md:text-6xl">
                身份认证 · <span className="text-[#8b5cf6]">{roleLabel(role)}</span>
              </h1>
              <p className="mt-5 text-lg font-bold text-white/52">{subtitle(role)}</p>
            </div>
            <div className="flex gap-3">
              <WalletConnectButton compact />
              {(["audience", "musician", "venue"] as Role[]).map((item) => (
                <button
                  className={item === role ? "wl-role-tab wl-role-tab-active" : "wl-role-tab"}
                  key={item}
                  onClick={() => setRole(item)}
                  type="button"
                >
                  {roleLabel(item)}
                </button>
              ))}
            </div>
          </header>

          <StepLine steps={steps} />

          <section className="wl-card mt-10 p-8 xl:p-10">
            {role === "audience" && <AudienceFields form={form} setForm={setForm} />}
            {role === "musician" && <MusicianFields form={form} setForm={setForm} />}
            {role === "venue" && <VenueFields form={form} setForm={setForm} />}
          </section>

          <div className="mx-auto mt-9 grid max-w-2xl gap-4">
            <button className="wl-gradient-button" disabled={submitting} onClick={() => void submit()} type="button">
              {submitting ? "AgentCard 注册中..." : "继续下一步 →"}
            </button>
            <p className="text-center text-sm font-bold text-white/42">
              Wallet owner: {isConnected ? address : "demo wallet fallback"} · A2A Registry + AgentProfile
            </p>
            {error && <p className="text-center text-sm font-black text-red-200">{error}</p>}
            {result && (
              <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm font-bold text-emerald-100">
                {String(result.status)} · {String(result.agentId)} ·{" "}
                <a className="underline" href={role === "audience" ? "/wish-pool" : "/my-agent"}>
                  {role === "audience" ? "进入许愿池" : "查看我的 Agent"}
                </a>
              </div>
            )}
          </div>

          <details className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5">
            <summary className="cursor-pointer font-mono text-xs font-black uppercase tracking-[0.24em] text-[#d49aff]">
              AgentCard JSON Preview
            </summary>
            <pre className="mt-4 max-h-[360px] overflow-auto text-xs leading-6 text-white/58">
              {JSON.stringify(card, null, 2)}
            </pre>
          </details>
        </section>
      </div>
    </main>
  );
}

function AudienceFields({ form, setForm }: FieldProps) {
  return (
    <div className="grid gap-10">
      <ChoiceSection
        selected={form.genres}
        title="1. 你喜欢什么音乐风格？"
        options={["rock", "pop", "electronic", "hip-hop", "indie", "folk", "r&b", "metal", "classical", "jazz", "punk", "other"]}
        onToggle={(value) => toggleArray(setForm, "genres", value)}
      />
      <ChoiceSection
        selected={form.formats}
        title="2. 期望看到什么样的演出？"
        options={["Arena Concert", "Live House", "Festival", "Online Show", "Live Stream", "Emerging Artist", "Cover / Tribute", "Other"]}
        onToggle={(value) => toggleArray(setForm, "formats", value)}
      />
      <ChoiceSection
        selected={form.timeSlots}
        title="3. 你想在什么时间看演出？"
        options={["Weeknight", "Weekend Afternoon", "Weekend Night", "Late Night", "Early Morning", "Flexible"]}
        onToggle={(value) => toggleArray(setForm, "timeSlots", value)}
      />
    </div>
  );
}

function MusicianFields({ form, setForm }: FieldProps) {
  return (
    <div className="grid gap-10 xl:grid-cols-2">
      <Field title="1. 你的乐队 / 艺名叫什么？">
        <input className="wl-input" onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="请输入乐队名或艺名" value={form.displayName} />
      </Field>
      <ChoiceSection selected={form.instruments} title="2. 你主要演奏什么乐器 / 角色？" options={["Vocal", "Guitar", "Bass", "Drums", "Keyboard", "Producer", "DJ / Electronic", "Other"]} onToggle={(value) => toggleArray(setForm, "instruments", value)} />
      <ChoiceSection selected={form.genres} title="3. 你的音乐风格是？" options={["rock", "pop", "electronic", "hip-hop", "folk", "r&b", "metal", "jazz", "classical", "punk", "indie", "other"]} onToggle={(value) => toggleArray(setForm, "genres", value)} />
      <Field title="4. 你的乐队有公开作品吗？">
        <input className="wl-input" onChange={(event) => setForm((current) => ({ ...current, publishedWorks: event.target.value }))} placeholder="粘贴 Spotify / 网易云 / SoundCloud 链接" value={form.publishedWorks} />
      </Field>
      <ChoiceSection selected={[form.experience]} title="5. 你们演过多少场演出？" options={["0-5", "6-20", "21-50", "51-100", "100+"]} onToggle={(value) => setForm((current) => ({ ...current, experience: value }))} />
      <ChoiceSection selected={[form.memberCount]} title="6. 你们乐队目前有几人？" options={["1", "2", "3", "4", "5", "5+"]} onToggle={(value) => setForm((current) => ({ ...current, memberCount: value }))} />
    </div>
  );
}

function VenueFields({ form, setForm }: FieldProps) {
  return (
    <div className="grid gap-9 xl:grid-cols-2">
      <Field title="1. 场地名称 *">
        <input className="wl-input" onChange={(event) => setForm((current) => ({ ...current, venueName: event.target.value }))} placeholder="请输入场地名称" value={form.venueName} />
      </Field>
      <Field title="2. 所在城市 *">
        <input className="wl-input" onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} placeholder="请选择所在城市" value={form.city} />
      </Field>
      <Field title="3. 场地容量 *">
        <input className="wl-input" onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))} placeholder="请输入场地最大容纳人数" value={form.capacity} />
      </Field>
      <Field title="4. 可提供档期 *">
        <input className="wl-input" placeholder="周五 / 周六 / 周日 晚间" readOnly value={form.timeSlots.join(", ")} />
      </Field>
      <Field title="5. 场地类型 *">
        <input className="wl-input" onChange={(event) => setForm((current) => ({ ...current, venueType: event.target.value }))} placeholder="Livehouse / 酒吧 / 音乐厅" value={form.venueType} />
      </Field>
      <Field title="适合的演出风格（系统判断）">
        <input className="wl-input" readOnly value={form.genres.join(", ")} />
      </Field>
      <Field title="6. 是否有专业舞台设备？">
        <textarea className="wl-textarea" onChange={(event) => setForm((current) => ({ ...current, facilities: event.target.value }))} value={form.facilities} />
      </Field>
      <ChoiceSection selected={form.genres} title="7. 过往举办过的演出风格" options={["rock", "metal", "punk", "pop", "electronic", "jazz", "hip-hop", "other"]} onToggle={(value) => toggleArray(setForm, "genres", value)} />
    </div>
  );
}

type FieldProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
};

function Field({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <label className="grid gap-4">
      <span className="text-xl font-black">{title}</span>
      {children}
    </label>
  );
}

function ChoiceSection({
  onToggle,
  options,
  selected,
  title
}: {
  onToggle: (value: string) => void;
  options: string[];
  selected: string[];
  title: string;
}) {
  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-xl font-black">{title}</h2>
        <p className="mt-2 text-sm font-bold text-white/42">可多选</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button className={active ? "wl-choice wl-choice-active" : "wl-choice"} key={option} onClick={() => onToggle(option)} type="button">
              <span>{option}</span>
              <span>{active ? "●" : "○"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StepLine({ steps }: { steps: readonly string[] }) {
  return (
    <div className="mt-12 grid items-start gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, index) => (
        <div className="relative grid justify-items-center gap-4" key={step}>
          <div className={index === 0 ? "wl-step-dot wl-step-dot-active" : "wl-step-dot"}>{index + 1}</div>
          <div className="text-sm font-black text-white/62">{step}</div>
        </div>
      ))}
    </div>
  );
}

function toggleArray(
  setForm: React.Dispatch<React.SetStateAction<FormState>>,
  key: keyof Pick<FormState, "genres" | "formats" | "timeSlots" | "instruments">,
  value: string
) {
  setForm((current) => ({
    ...current,
    [key]: current[key].includes(value)
      ? current[key].filter((entry) => entry !== value)
      : [...current[key], value]
  }));
}

function parseRole(value: string | null): Role {
  if (value === "musician" || value === "venue") {
    return value;
  }
  return "audience";
}

function roleLabel(role: Role) {
  return role === "audience" ? "观众" : role === "musician" ? "乐手" : "场地方";
}

function subtitle(role: Role) {
  if (role === "musician") {
    return "告诉我们关于你的乐队或你的音乐身份";
  }
  if (role === "venue") {
    return "填写场地信息，帮助我们更好地为你匹配合适的演出与乐队";
  }
  return "回答几个问题，帮助我们更懂你，为你推荐更合适的演出";
}

function englishStep(step: string) {
  const map: Record<string, string> = {
    身份认证: "Identity Verification",
    个人偏好: "Preferences",
    推荐预览: "Preview",
    完成: "Complete",
    作品与经历: "Experience",
    预览: "Preview",
    场地信息: "Venue Information",
    场地设备: "Facilities",
    过往演出: "Experience",
    资质上传: "Documents"
  };
  return map[step] ?? step;
}

function buildAgentCard(role: Role, form: FormState, walletAddress?: `0x${string}`): AgentCard {
  const displayName = form.displayName || form.venueName || `WishLive ${roleLabel(role)} Agent`;
  const agentId = `agent:${role}:local-${stableId(role, displayName, form.city)}`;
  const wallet = walletAddress ?? "0x000000000000000000000000000000000000dEaD";
  const skills = roleSkills(role);
  const city = form.city.toLowerCase();
  const primaryGenre = form.genres[0] ?? "rock";
  return {
    agent_id: agentId,
    did: `did:wishlive:${wallet.toLowerCase()}`,
    wallet,
    type: role,
    name: displayName,
    description: `${displayName} represents a ${role} in WishLive A2A marketplace.`,
    skills,
    skill_details: skills.map((skill) => ({
      id: skill,
      name: skill.replaceAll("_", " "),
      description: `${displayName} can ${skill.replaceAll("_", " ")}.`,
      tags: [role, city],
      examples: [`${skill} for ${primaryGenre} in ${city}`]
    })),
    tags: [`role:${role}`, `city:${city}`, ...form.genres.map((genre) => `genre:${genre}`)],
    reputation: role === "audience" ? 72 : role === "musician" ? 84 : 81,
    reputationBreakdown: {
      completedDeals: role === "audience" ? 0 : 8,
      failures: 0,
      complaints: 0,
      responseTimeScore: 86,
      fulfillmentRate: 0.94,
      score: role === "audience" ? 72 : role === "musician" ? 84 : 81
    },
    supported_interfaces: [
      {
        url: `redis://agent.task/${agentId}`,
        protocol_binding: "Redis+JSON",
        protocol_version: "1.0",
        tenant: "wishlive"
      }
    ],
    capabilities: {
      streaming: true,
      push_notifications: true,
      tool_calls: true,
      a2a_discovery: true
    },
    default_input_modes: ["application/json", "text/plain"],
    default_output_modes: ["application/json", "text/plain"],
    managerAgentId: role === "musician" ? "agent:manager:001" : role === "venue" ? "agent:manager:002" : undefined,
    listenStreams: ["agent.task", "wish.events", "negotiation.events", "show.events"],
    emitEvents: ["agent.message", "agent.tool_call"],
    systemPrompt: `${displayName} is an autonomous ${role} agent for WishLive. Use tools, follow A2A protocol, and publish Redis events.`,
    metadata: {
      city,
      genre: primaryGenre,
      preferredGenres: form.genres,
      preferredFormats: form.formats,
      timeSlots: form.timeSlots,
      instruments: form.instruments,
      experience: form.experience,
      memberCount: Number(form.memberCount.replace("+", "")) || 1,
      capacity: Number(form.capacity) || undefined,
      venueType: form.venueType,
      facilities: form.facilities,
      publishedWorks: form.publishedWorks,
      availabilityCalendar: ["2026-07-17", "2026-07-18", "2026-07-19"],
      availableDates: ["2026-07-17", "2026-07-18", "2026-07-19"],
      splitPreference: role === "venue" ? 22 : 25,
      baseFee: role === "venue" ? 5000 : undefined,
      minFee: role === "musician" ? 2400 : undefined
    }
  };
}

function roleSkills(role: Role) {
  if (role === "musician") {
    return ["check_availability", "propose_offer", "counter_offer", "accept_offer", "reject_offer"];
  }
  if (role === "venue") {
    return ["check_capacity", "quote_price", "counter_offer", "accept_offer", "reject_offer"];
  }
  return ["submit_wish", "withdraw_wish", "confirm_show"];
}

function stableId(...parts: string[]) {
  const input = parts.join("|").toLowerCase();
  let hash = 0;
  for (const char of input) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
