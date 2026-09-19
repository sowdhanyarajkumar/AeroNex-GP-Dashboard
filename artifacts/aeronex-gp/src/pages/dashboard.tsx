import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import {
  Activity,
  AlertTriangle,
  Aperture,
  ArrowDownRight,
  ArrowUpRight,
  BadgeInfo,
  Check,
  ChevronRight,
  CircleHelp,
  Gauge,
  History,
  Info,
  LayoutDashboard,
  Menu,
  Pause,
  Play,
  RotateCcw,
  Satellite,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Thermometer,
  Timer,
  TowerControl,
  TriangleAlert,
  X,
  Zap,
} from 'lucide-react';
import {
  getGetAlertsQueryKey,
  getGetControlStateQueryKey,
  getGetEnvironmentHistoryQueryKey,
  getGetEnvironmentQueryKey,
  getGetHealthHistoryQueryKey,
  getGetPredictiveHealthQueryKey,
  getGetSystemStatusQueryKey,
  getGetTrackingHistoryQueryKey,
  getGetTrackingQueryKey,
  getHealthCheckQueryKey,
  useGetAlerts,
  useGetControlState,
  useGetEnvironment,
  useGetEnvironmentHistory,
  useGetHealthHistory,
  useGetPredictiveHealth,
  useGetSystemStatus,
  useGetTracking,
  useGetTrackingHistory,
  useHealthCheck,
  usePauseSimulation,
  useResetSimulation,
  useSetCameraPosition,
  useSetTrackingMode,
  useStartSimulation,
} from '@workspace/api-client-react';
import type {
  Alert,
  ControlState,
  EnvironmentReading,
  HealthReading,
  TrackingReading,
} from '@workspace/api-client-react';

const fallbackEnvironment: EnvironmentReading = {
  timestamp: new Date().toISOString(),
  temperature: -42.8,
  pressure: 28.4,
  humidity: 16.2,
  vibration: 0.018,
  condition: 'NOMINAL',
};
const fallbackTracking: TrackingReading = {
  timestamp: new Date().toISOString(),
  targetDetected: true,
  targetX: 58,
  targetY: 42,
  confidence: 87.6,
  trackingError: 1.8,
  bearing: 214.6,
  elevation: 18.4,
  range: 2.86,
  status: 'STABLE',
};
const fallbackHealth: HealthReading = {
  timestamp: new Date().toISOString(),
  estimatedHealth: 94.2,
  predictedHealth: 91.7,
  degradationRate: 0.13,
  thermalState: 'NOMINAL',
  riskLevel: 'LOW',
};
const fallbackControl: ControlState = {
  environmentalState: 'NOMINAL',
  operatingMode: 'COMPENSATED',
  adaptiveControl: true,
  recommendation: 'Maintain compensated profile. Crosswind model is within expected envelope.',
  compensation: '+1.8° yaw / −0.4° elevation',
  pan: 214.6,
  tilt: 18.4,
};

function formatTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString([], { month: 'short', day: '2-digit' });
}

function StatusPill({ tone, children }: { tone: 'teal' | 'amber' | 'red' | 'slate'; children: ReactNode }) {
  const tones = {
    teal: 'border-teal-400/25 bg-teal-400/10 text-teal-300',
    amber: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
    red: 'border-red-400/25 bg-red-400/10 text-red-300',
    slate: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[10px] font-medium tracking-[0.14em] ${tones[tone]}`}>{children}</span>;
}

function Panel({
  title,
  eyebrow,
  icon: Icon,
  children,
  className = '',
  action,
}: {
  title: string;
  eyebrow?: string;
  icon: typeof Activity;
  children: ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={`relative overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/80 shadow-[0_14px_40px_rgba(0,0,0,.16)] ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-800/90 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-teal-300/20 bg-teal-300/5 text-teal-300"><Icon size={15} strokeWidth={1.8} /></div>
          <div className="min-w-0">
            {eyebrow && <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{eyebrow}</div>}
            <h2 className="truncate text-[13px] font-semibold tracking-wide text-slate-100">{title}</h2>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, unit, tone = 'text-slate-100', note }: { label: string; value: string; unit?: string; tone?: string; note?: string }) {
  return (
    <div data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`} className="border-l border-slate-800 pl-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-1 font-mono text-xl font-medium tracking-tight ${tone}`}>{value}<span className="ml-1 text-[10px] text-slate-500">{unit}</span></div>
      {note && <div className="mt-1 text-[10px] text-slate-500">{note}</div>}
    </div>
  );
}

function Sparkline({ values, color = '#33e1c5', label }: { values: number[]; color?: string; label: string }) {
  const points = useMemo(() => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${30 - ((value - min) / Math.max(max - min, 0.01)) * 24}`).join(' ');
  }, [values]);
  return (
    <svg aria-label={label} role="img" viewBox="0 0 100 32" preserveAspectRatio="none" className="h-10 w-full">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.7" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="flex min-h-28 items-center justify-center border border-dashed border-slate-700/80 bg-slate-950/30 px-4 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500" data-testid={`empty-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</div>;
}

function Dashboard() {
  const [mobileNav, setMobileNav] = useState(false);
  const [localRunning, setLocalRunning] = useState<boolean | undefined>();
  const [trackingMode, setTrackingMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [pan, setPan] = useState(214.6);
  const [tilt, setTilt] = useState(18.4);
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});

  const healthCheck = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 15000 } });
  const systemQuery = useGetSystemStatus({ query: { queryKey: getGetSystemStatusQueryKey(), refetchInterval: 4000 } });
  const environmentQuery = useGetEnvironment({ query: { queryKey: getGetEnvironmentQueryKey(), refetchInterval: 4000 } });
  const trackingQuery = useGetTracking({ query: { queryKey: getGetTrackingQueryKey(), refetchInterval: 4000 } });
  const healthQuery = useGetPredictiveHealth({ query: { queryKey: getGetPredictiveHealthQueryKey(), refetchInterval: 5000 } });
  const controlQuery = useGetControlState({ query: { queryKey: getGetControlStateQueryKey(), refetchInterval: 5000 } });
  const alertsQuery = useGetAlerts({ query: { queryKey: getGetAlertsQueryKey(), refetchInterval: 5000 } });
  const environmentHistoryQuery = useGetEnvironmentHistory({ limit: 24 }, { query: { queryKey: getGetEnvironmentHistoryQueryKey({ limit: 24 }), refetchInterval: 10000 } });
  const healthHistoryQuery = useGetHealthHistory({ limit: 24 }, { query: { queryKey: getGetHealthHistoryQueryKey({ limit: 24 }), refetchInterval: 10000 } });
  const trackingHistoryQuery = useGetTrackingHistory({ limit: 24 }, { query: { queryKey: getGetTrackingHistoryQueryKey({ limit: 24 }), refetchInterval: 10000 } });

  const startSimulation = useStartSimulation();
  const pauseSimulation = usePauseSimulation();
  const resetSimulation = useResetSimulation();
  const setTracking = useSetTrackingMode();
  const setCamera = useSetCameraPosition();

  const system = systemQuery.data;
  const environment = environmentQuery.data ?? fallbackEnvironment;
  const tracking = trackingQuery.data ?? fallbackTracking;
  const health = healthQuery.data ?? fallbackHealth;
  const control = controlQuery.data ?? fallbackControl;
  const alerts = alertsQuery.data ?? [];
  const running = localRunning ?? system?.simulationRunning ?? false;
  const connected = Boolean(healthCheck.data || systemQuery.data) && !systemQuery.isError && !healthCheck.isError;
  const hasAnyError = [systemQuery, environmentQuery, trackingQuery, healthQuery, controlQuery, alertsQuery].some((query) => query.isError);
  const envHistory = environmentHistoryQuery.data ?? [];
  const healthHistory = healthHistoryQuery.data ?? [];
  const trackingHistory = trackingHistoryQuery.data ?? [];
  const envSpark = envHistory.length ? envHistory.map((item) => item.temperature) : [-44, -43.6, -43.3, -43.8, -42.9, -42.8, -42.5, -42.8];
  const healthSpark = healthHistory.length ? healthHistory.map((item) => item.predictedHealth) : [96, 95.5, 95, 94.7, 94.2, 93.9, 92.8, 91.7];
  const trackingSpark = trackingHistory.length ? trackingHistory.map((item) => item.trackingError) : [2.8, 2.5, 2.2, 2.4, 1.9, 2.1, 1.7, 1.8];
  const activeAlerts = alerts.filter((alert) => !alert.acknowledged && !acknowledged[alert.id]);

  const handleStart = () => {
    setLocalRunning(true);
    startSimulation.mutate(undefined, { onSuccess: (state) => setLocalRunning(state.simulationRunning) });
  };
  const handlePause = () => {
    setLocalRunning(false);
    pauseSimulation.mutate(undefined, { onSuccess: (state) => setLocalRunning(state.simulationRunning) });
  };
  const handleReset = () => {
    resetSimulation.mutate(undefined, { onSuccess: (state) => setLocalRunning(state.simulationRunning) });
  };
  const handleMode = (mode: 'AUTO' | 'MANUAL') => {
    setTrackingMode(mode);
    setTracking.mutate({ data: { mode } });
  };
  const handleCamera = () => {
    setCamera.mutate({ data: { pan, tilt } });
  };

  return (
    <div className="min-h-[100dvh] bg-transparent text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button data-testid="button-mobile-nav" aria-label="Open navigation" onClick={() => setMobileNav(!mobileNav)} className="rounded border border-slate-700 p-2 text-slate-400 hover:border-teal-300/50 hover:text-teal-300 lg:hidden"><Menu size={16} /></button>
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-teal-300/40 bg-teal-300/10 text-teal-300"><Aperture size={21} strokeWidth={1.5} /></div>
            <div>
              <div className="text-sm font-extrabold tracking-[0.2em] text-slate-100">AERONEX <span className="text-teal-300">GP</span></div>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">High-altitude operations console</div>
            </div>
          </div>
          <div className="hidden items-center gap-5 md:flex">
            <div className="text-right">
              <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">system time</div>
              <div className="font-mono text-xs text-slate-300">{formatTime(system?.timestamp ?? new Date().toISOString())} UTC</div>
            </div>
            <StatusPill tone="amber"><span className="h-1.5 w-1.5 rounded-full bg-amber-300 signal-pulse" /> SIMULATION ONLY</StatusPill>
            <div className="flex items-center gap-2 border-l border-slate-800 pl-5 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500"><span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-teal-300 signal-pulse' : 'bg-red-400'}`} /> {connected ? 'API LINK' : 'LINK LOST'}</div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1680px]">
        <aside className={`${mobileNav ? 'fixed inset-y-16 left-0 z-30 flex' : 'hidden'} w-60 shrink-0 border-r border-slate-800/90 bg-slate-950/98 p-4 lg:sticky lg:top-16 lg:flex lg:h-[calc(100dvh-4rem)] lg:flex-col`}>
          <div className="mb-5 px-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-600">Navigation / console</div>
          <nav className="space-y-1">
            <Link href="/" data-testid="link-dashboard" className="flex items-center gap-3 rounded-md border border-teal-300/20 bg-teal-300/10 px-3 py-2.5 text-xs font-semibold text-teal-200"><LayoutDashboard size={15} /> Command dashboard</Link>
            <Link href="/about" data-testid="link-about" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-xs text-slate-400 hover:bg-slate-900 hover:text-slate-100"><CircleHelp size={15} /> System brief</Link>
          </nav>
          <div className="mt-auto space-y-3">
            <div className="rounded-md border border-amber-300/20 bg-amber-300/5 p-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200"><BadgeInfo size={13} /> Boundary condition</div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">No physical hardware connected. Every signal on this console is generated by the simulation service.</p>
            </div>
            <div className="flex items-center gap-2 px-2 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-600"><ShieldCheck size={13} /> SIH demonstration profile</div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-teal-300"><span className="h-1.5 w-1.5 rounded-full bg-teal-300 signal-pulse" /> live mission view <ChevronRight size={13} className="text-slate-600" /> 01</div>
              <h1 className="text-3xl font-extrabold tracking-tightest text-slate-50 sm:text-4xl">Command dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">Read the simulated atmospheric envelope, target track, and system response as one connected operating picture.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button data-testid="button-start-simulation" onClick={handleStart} disabled={running || startSimulation.isPending} className="flex items-center gap-2 rounded-md border border-teal-300/40 bg-teal-300/15 px-3 py-2 text-xs font-bold text-teal-200 hover:bg-teal-300/25 disabled:cursor-not-allowed disabled:opacity-40"><Play size={14} fill="currentColor" /> {startSimulation.isPending ? 'Starting' : 'Start simulation'}</button>
              <button data-testid="button-pause-simulation" onClick={handlePause} disabled={!running || pauseSimulation.isPending} className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"><Pause size={14} /> Pause</button>
              <button data-testid="button-reset-simulation" onClick={handleReset} disabled={resetSimulation.isPending} className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-400 hover:border-slate-500 hover:text-slate-200 disabled:opacity-40"><RotateCcw size={14} /> Reset</button>
            </div>
          </div>

          {hasAnyError && <div data-testid="status-backend-connection-lost" className="mb-5 flex items-start gap-3 rounded-md border border-red-400/25 bg-red-400/5 px-4 py-3 text-xs text-red-200"><X size={15} className="mt-0.5 shrink-0" /><div><strong className="font-semibold">Telemetry link degraded.</strong> One or more REST polling channels are unavailable. Showing last known or composed simulation values so the console remains readable.</div></div>}

          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="animate-enter rounded-lg border border-slate-700/60 bg-slate-900/80 p-4"><div className="flex items-center justify-between"><div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">system state</div><Activity size={14} className="text-teal-300" /></div><div data-testid="status-system" className="mt-2 flex items-center gap-2 text-lg font-bold"><span className={`h-2 w-2 rounded-full ${system?.online ? 'bg-teal-300 signal-pulse' : connected ? 'bg-amber-300' : 'bg-red-400'}`} />{system?.online ? 'ONLINE' : connected ? 'STANDBY' : 'OFFLINE'}</div><div className="mt-1 font-mono text-[10px] text-slate-500">uptime {system?.uptime ?? '00:00:00'}</div></div>
            <div className="animate-enter animate-enter-1 rounded-lg border border-amber-300/25 bg-amber-300/5 p-4"><div className="flex items-center justify-between"><div className="font-mono text-[9px] uppercase tracking-[0.15em] text-amber-200/70">operating boundary</div><Satellite size={14} className="text-amber-200" /></div><div data-testid="status-simulation-mode" className="mt-2 text-lg font-bold text-amber-100">SIMULATION MODE</div><div className="mt-1 font-mono text-[10px] text-amber-200/60">no hardware connected</div></div>
            <div className="animate-enter animate-enter-2 rounded-lg border border-slate-700/60 bg-slate-900/80 p-4"><div className="flex items-center justify-between"><div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">loop control</div><Timer size={14} className="text-cyan-300" /></div><div data-testid="status-simulation-running" className="mt-2 text-lg font-bold text-slate-100">{running ? 'RUNNING' : 'PAUSED'}</div><div className="mt-1 font-mono text-[10px] text-slate-500">poll interval 4.0 sec</div></div>
            <div className="animate-enter animate-enter-3 rounded-lg border border-slate-700/60 bg-slate-900/80 p-4"><div className="flex items-center justify-between"><div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">data freshness</div><Zap size={14} className="text-teal-300" /></div><div data-testid="text-last-update" className="mt-2 text-lg font-bold text-slate-100">{formatTime(environment.timestamp)}</div><div className="mt-1 font-mono text-[10px] text-slate-500">latest environment sample</div></div>
          </div>

          <div className="grid gap-5 xl:grid-cols-12">
            <Panel title="Atmospheric envelope" eyebrow="telemetry / environment" icon={Thermometer} className="xl:col-span-7" action={<StatusPill tone={environment.condition === 'NOMINAL' ? 'teal' : environment.condition === 'CAUTION' ? 'amber' : 'red'}>{environment.condition}</StatusPill>}>
              <div className="grid gap-5 p-4 lg:grid-cols-[1fr_220px]">
                <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4 lg:grid-cols-2">
                  <Metric label="Temperature" value={environment.temperature.toFixed(1)} unit="°C" tone="text-cyan-200" note="stratospheric layer" />
                  <Metric label="Pressure" value={environment.pressure.toFixed(1)} unit="hPa" note="altitude model" />
                  <Metric label="Humidity" value={environment.humidity.toFixed(1)} unit="%" note="relative" />
                  <Metric label="Vibration" value={environment.vibration.toFixed(3)} unit="g" tone={environment.vibration > 0.06 ? 'text-amber-200' : 'text-teal-200'} note="platform model" />
                </div>
                <div className="border-l border-slate-800 pl-4"><div className="mb-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500"><span>thermal trace</span><span>{envHistory.length ? `${envHistory.length} samples` : 'composed trace'}</span></div><Sparkline values={envSpark} color="#55cce8" label="Temperature history sparkline" /><div className="mt-2 flex justify-between font-mono text-[9px] text-slate-600"><span>{formatDate(envHistory[0]?.timestamp)}</span><span>{formatDate(envHistory.at(-1)?.timestamp)}</span></div></div>
              </div>
            </Panel>

            <Panel title="Predictive system health" eyebrow="model / horizon" icon={Gauge} className="xl:col-span-5" action={<StatusPill tone={health.riskLevel === 'LOW' ? 'teal' : health.riskLevel === 'MEDIUM' ? 'amber' : 'red'}>{health.riskLevel} RISK</StatusPill>}>
              <div className="p-4">
                <div className="flex items-end justify-between gap-4"><div><div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">estimated health</div><div data-testid="value-estimated-health" className="mt-1 font-mono text-4xl font-medium tracking-tight text-teal-200">{health.estimatedHealth.toFixed(1)}<span className="text-base text-slate-500">%</span></div></div><div className="text-right"><div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">predicted / 30m</div><div data-testid="value-predicted-health" className="mt-1 font-mono text-2xl text-slate-200">{health.predictedHealth.toFixed(1)}%</div></div></div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-teal-300 transition-[width] duration-500" style={{ width: `${Math.min(100, health.estimatedHealth)}%` }} /></div>
                <div className="mt-4 grid grid-cols-3 gap-3"><Metric label="degradation" value={health.degradationRate.toFixed(2)} unit="%/h" /><Metric label="thermal" value={health.thermalState} tone={health.thermalState === 'NOMINAL' ? 'text-teal-200' : 'text-amber-200'} /><Metric label="risk" value={health.riskLevel} tone={health.riskLevel === 'LOW' ? 'text-teal-200' : 'text-amber-200'} /></div>
                <div className="mt-4 border-t border-slate-800 pt-3"><div className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500"><span>health trajectory</span><span>{healthHistory.length ? 'polling' : 'preview'}</span></div><Sparkline values={healthSpark} label="Predicted health sparkline" /></div>
              </div>
            </Panel>

            <Panel title="Simulated target track" eyebrow="tracking / synthetic object" icon={Target} className="xl:col-span-7" action={<StatusPill tone={tracking.status === 'STABLE' ? 'teal' : tracking.status === 'SEARCHING' ? 'amber' : 'red'}><span className={`h-1.5 w-1.5 rounded-full ${tracking.status === 'STABLE' ? 'bg-teal-300 signal-pulse' : 'bg-amber-300'}`} />{tracking.status}</StatusPill>}>
              <div className="grid gap-5 p-4 lg:grid-cols-[1.3fr_1fr]">
                <div className="console-grid scanline relative aspect-[1.75/1] min-h-[220px] overflow-hidden rounded-md border border-slate-700/70 bg-slate-950/80">
                  <div className="absolute inset-[12%] rounded-full border border-teal-300/20" /><div className="absolute inset-[27%] rounded-full border border-teal-300/15" /><div className="absolute inset-[42%] rounded-full border border-teal-300/10" />
                  <div className="absolute left-1/2 top-[10%] h-[80%] w-px bg-teal-300/15" /><div className="absolute left-[10%] top-1/2 h-px w-[80%] bg-teal-300/15" />
                  <div className="absolute left-[58%] top-[42%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-200 bg-teal-300/20 shadow-[0_0_20px_rgba(51,225,197,.5)]"><span className="absolute inset-1 rounded-full bg-teal-200 signal-pulse" /></div>
                  <div className="absolute left-[58%] top-[42%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-300/40" />
                  <div className="absolute left-3 top-3 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">synthetic track plane / XY</div><div className="absolute bottom-3 left-3 font-mono text-[9px] text-teal-300">TGT-SIM-01 // {tracking.confidence.toFixed(1)}% conf.</div><div className="absolute right-3 top-3 font-mono text-[9px] text-slate-600">N ↑</div>
                </div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-4 content-start"><Metric label="Confidence" value={tracking.confidence.toFixed(1)} unit="%" tone="text-teal-200" /><Metric label="Track error" value={tracking.trackingError.toFixed(1)} unit="px" tone="text-cyan-200" /><Metric label="Bearing" value={tracking.bearing.toFixed(1)} unit="°" /><Metric label="Elevation" value={tracking.elevation.toFixed(1)} unit="°" /><Metric label="Range" value={tracking.range.toFixed(2)} unit="km" /><Metric label="Coordinates" value={`${tracking.targetX.toFixed(0)} / ${tracking.targetY.toFixed(0)}`} unit="%" /><div className="col-span-2 mt-1 border-t border-slate-800 pt-3"><div className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500"><span>error history</span><span>last {trackingSpark.length}</span></div><Sparkline values={trackingSpark} color="#f2c35f" label="Tracking error sparkline" /></div></div>
              </div>
            </Panel>

            <Panel title="Adaptive control" eyebrow="control / recommendation" icon={SlidersHorizontal} className="xl:col-span-5">
              <div className="space-y-4 p-4">
                <div className="rounded-md border border-teal-300/20 bg-teal-300/5 p-3"><div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-teal-200"><ArrowUpRight size={13} /> recommended action</div><p data-testid="text-control-recommendation" className="mt-2 text-xs leading-relaxed text-slate-300">{control.recommendation}</p></div>
                <div className="grid grid-cols-2 gap-3"><div className="rounded border border-slate-800 bg-slate-950/40 p-3"><div className="font-mono text-[9px] uppercase tracking-[0.13em] text-slate-500">environment</div><div className="mt-1 text-sm font-semibold text-slate-200">{control.environmentalState}</div></div><div className="rounded border border-slate-800 bg-slate-950/40 p-3"><div className="font-mono text-[9px] uppercase tracking-[0.13em] text-slate-500">operating mode</div><div className="mt-1 text-sm font-semibold text-teal-200">{control.operatingMode}</div></div></div>
                <div><div className="mb-2 font-mono text-[9px] uppercase tracking-[0.13em] text-slate-500">tracking mode</div><div className="grid grid-cols-2 gap-2"><button data-testid="button-tracking-auto" onClick={() => handleMode('AUTO')} className={`rounded border px-3 py-2 text-xs font-semibold ${trackingMode === 'AUTO' ? 'border-teal-300/40 bg-teal-300/10 text-teal-200' : 'border-slate-700 bg-slate-950/30 text-slate-500'}`}>AUTO adaptive</button><button data-testid="button-tracking-manual" onClick={() => handleMode('MANUAL')} className={`rounded border px-3 py-2 text-xs font-semibold ${trackingMode === 'MANUAL' ? 'border-amber-300/40 bg-amber-300/10 text-amber-200' : 'border-slate-700 bg-slate-950/30 text-slate-500'}`}>MANUAL assist</button></div></div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-3"><div><div className="font-mono text-[9px] uppercase tracking-[0.13em] text-slate-500">compensation</div><div className="mt-1 font-mono text-sm text-cyan-200">{control.compensation}</div></div><div className="flex items-center gap-2 text-[10px] text-slate-500"><span className={`h-1.5 w-1.5 rounded-full ${control.adaptiveControl ? 'bg-teal-300 signal-pulse' : 'bg-slate-600'}`} /> adaptive {control.adaptiveControl ? 'on' : 'off'}</div></div>
              </div>
            </Panel>

            <Panel title="Camera position" eyebrow="simulated actuator state" icon={TowerControl} className="xl:col-span-4">
              <div className="space-y-4 p-4"><div className="grid grid-cols-2 gap-4"><label className="font-mono text-[9px] uppercase tracking-[0.13em] text-slate-500">pan <input data-testid="input-camera-pan" type="number" min="-90" max="90" value={pan} onChange={(event) => setPan(Number(event.target.value))} className="mt-2 w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-2 font-mono text-sm text-slate-200 outline-none focus:border-teal-300/60" /></label><label className="font-mono text-[9px] uppercase tracking-[0.13em] text-slate-500">tilt <input data-testid="input-camera-tilt" type="number" min="-45" max="45" value={tilt} onChange={(event) => setTilt(Number(event.target.value))} className="mt-2 w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-2 font-mono text-sm text-slate-200 outline-none focus:border-teal-300/60" /></label></div><button data-testid="button-apply-camera" onClick={handleCamera} disabled={setCamera.isPending} className="flex w-full items-center justify-center gap-2 rounded border border-slate-700 bg-slate-800/50 py-2 text-xs font-semibold text-slate-300 hover:border-teal-300/40 hover:text-teal-200 disabled:opacity-50"><Settings2 size={14} /> {setCamera.isPending ? 'Applying…' : 'Apply simulated position'}</button><div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.13em] text-slate-600"><span>range limits enforced</span><Check size={13} className="text-teal-300" /></div></div>
            </Panel>

            <Panel title="Alert stream" eyebrow="events / simulated" icon={AlertTriangle} className="xl:col-span-8" action={<span className="font-mono text-[10px] text-slate-500">{activeAlerts.length} unacknowledged</span>}>
              <div className="divide-y divide-slate-800/80">{alertsQuery.isLoading && <div className="space-y-3 p-4"><div className="h-3 w-2/3 animate-pulse rounded bg-slate-800" /><div className="h-3 w-full animate-pulse rounded bg-slate-800" /></div>}{!alertsQuery.isLoading && alerts.length === 0 && <EmptyState label="No active simulation alerts" />}{alerts.slice(0, 5).map((alert: Alert) => { const done = alert.acknowledged || acknowledged[alert.id]; return <div key={alert.id} className={`flex items-start gap-3 px-4 py-3 ${done ? 'opacity-45' : ''}`} data-testid={`row-alert-${alert.id}`}><div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded ${alert.severity === 'CRITICAL' ? 'bg-red-400/10 text-red-300' : alert.severity === 'WARNING' ? 'bg-amber-300/10 text-amber-200' : 'bg-cyan-300/10 text-cyan-200'}`}>{alert.severity === 'CRITICAL' ? <TriangleAlert size={13} /> : alert.severity === 'WARNING' ? <AlertTriangle size={13} /> : <Info size={13} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">{alert.type}</span><StatusPill tone={alert.severity === 'CRITICAL' ? 'red' : alert.severity === 'WARNING' ? 'amber' : 'slate'}>{alert.severity}</StatusPill></div><p className="mt-1 text-xs text-slate-300">{alert.message}</p><div className="mt-1 font-mono text-[9px] text-slate-600">{formatTime(alert.timestamp)}</div></div><button data-testid={`button-acknowledge-${alert.id}`} onClick={() => setAcknowledged((current) => ({ ...current, [alert.id]: true }))} disabled={done} className="shrink-0 rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-400 hover:border-teal-300/40 hover:text-teal-200 disabled:cursor-default disabled:opacity-50">{done ? 'acknowledged' : 'ack'}</button></div>; })}</div>
            </Panel>

            <Panel title="Simulation history" eyebrow="lookback / 24 samples" icon={History} className="xl:col-span-12" action={<div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.13em] text-slate-600"><ArrowDownRight size={13} /> trend view</div>}>
              <div className="grid gap-px bg-slate-800/80 md:grid-cols-3"><div className="bg-slate-900/95 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-slate-300">Temperature</span><span className="font-mono text-[10px] text-cyan-300">{environment.temperature.toFixed(1)}°C</span></div><Sparkline values={envSpark} color="#55cce8" label="Temperature history" /><div className="mt-2 flex justify-between font-mono text-[9px] text-slate-600"><span>older</span><span>now</span></div></div><div className="bg-slate-900/95 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-slate-300">Predicted health</span><span className="font-mono text-[10px] text-teal-300">{health.predictedHealth.toFixed(1)}%</span></div><Sparkline values={healthSpark} color="#33e1c5" label="Health history" /><div className="mt-2 flex justify-between font-mono text-[9px] text-slate-600"><span>older</span><span>now</span></div></div><div className="bg-slate-900/95 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-slate-300">Tracking error</span><span className="font-mono text-[10px] text-amber-200">{tracking.trackingError.toFixed(1)}px</span></div><Sparkline values={trackingSpark} color="#f2c35f" label="Tracking history" /><div className="mt-2 flex justify-between font-mono text-[9px] text-slate-600"><span>older</span><span>now</span></div></div></div>
            </Panel>
          </div>

          <footer className="mt-7 flex flex-col justify-between gap-2 border-t border-slate-800/80 pt-4 font-mono text-[9px] uppercase tracking-[0.13em] text-slate-600 sm:flex-row"><span>AeroNex GP // simulation-first operations console</span><span>Telemetry is simulated · no physical hardware or field control connected</span></footer>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;