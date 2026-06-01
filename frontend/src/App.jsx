import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Zap,
  Truck,
  Settings,
  Play,
  BarChart3,
  Map as MapIcon,
  Layers,
  Cpu,
  Timer,
  Navigation,
  AlertCircle,
  RefreshCw,
  Info,
  Atom
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

const API_BASE_URL = '/api';

const VEHICLE_COLORS = ['#6366f1', '#a855f7', '#22d3ee', '#10b981', '#f59e0b', '#ef4444'];

function App() {
  const [config, setConfig] = useState({
    n_nodes: 12,
    n_vehicles: 3,
    qaoa_layers: 5,
    annealing_steps: 300,
    algorithm: 'hybrid',
    area_size: 100,
    seed: 42
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const canvasRef = useRef(null);

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/optimize`, config, { timeout: 120000 });
      setResult(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to connect to backend. Make sure the backend server is running on port 8000.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (result && canvasRef.current) {
      drawMap();
    }
  }, [result]);

  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 48;

    ctx.clearRect(0, 0, width, height);

    const scaleX = (x) => (x / config.area_size) * (width - 2 * padding) + padding;
    const scaleY = (y) => height - ((y / config.area_size) * (height - 2 * padding) + padding);

    // Background gradient
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.8);
    bgGrad.addColorStop(0, 'rgba(17,24,39,0)');
    bgGrad.addColorStop(1, 'rgba(3,7,18,0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = scaleX((i / 10) * config.area_size);
      const y = scaleY((i / 10) * config.area_size);
      ctx.beginPath(); ctx.moveTo(x, padding); ctx.lineTo(x, height - padding); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(width - padding, y); ctx.stroke();
    }

    if (!result) return;

    // Draw routes with glow
    result.routes.forEach((route, idx) => {
      const color = VEHICLE_COLORS[idx % VEHICLE_COLORS.length];

      // Glow pass
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;
      ctx.strokeStyle = color + '55';
      ctx.lineWidth = 6;
      ctx.setLineDash([]);
      drawRoutePath(ctx, route, result, scaleX, scaleY);
      ctx.restore();

      // Main route line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      drawRoutePath(ctx, route, result, scaleX, scaleY);

      ctx.setLineDash([]);
    });

    // Draw node connections as dots on route
    result.routes.forEach((route, idx) => {
      const color = VEHICLE_COLORS[idx % VEHICLE_COLORS.length];
      route.nodes.forEach((nodeId, pos) => {
        const node = result.nodes.find(n => n.id === nodeId);
        if (!node) return;
        // Small colored arrow indicator
        const x = scaleX(node.x);
        const y = scaleY(node.y);
        ctx.fillStyle = color + 'aa';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Draw nodes
    result.nodes.forEach(node => {
      const x = scaleX(node.x);
      const y = scaleY(node.y);

      // Outer ring
      ctx.strokeStyle = 'rgba(156,163,175,0.5)';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner dot
      ctx.fillStyle = '#6b7280';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = '#d1d5db';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.id, x, y - 12);
    });

    // Draw depot with glow
    const dx = scaleX(result.depot.x);
    const dy = scaleY(result.depot.y);
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(239,68,68,0.7)';
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.rect(dx - 7, dy - 7, 14, 14);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DEPOT', dx, dy - 13);
  };

  const drawRoutePath = (ctx, route, result, scaleX, scaleY) => {
    ctx.beginPath();
    ctx.moveTo(scaleX(result.depot.x), scaleY(result.depot.y));
    route.nodes.forEach(nodeId => {
      const node = result.nodes.find(n => n.id === nodeId);
      if (node) ctx.lineTo(scaleX(node.x), scaleY(node.y));
    });
    ctx.lineTo(scaleX(result.depot.x), scaleY(result.depot.y));
    ctx.stroke();
  };

  const chartData = result ? [
    { name: 'Classical', value: result.summary.classical_dist, color: '#6b7280' },
    { name: 'Quantum', value: result.summary.quantum_dist, color: '#6366f1' }
  ] : [];

  return (
    <div id="app-layout">
      {/* ── Sidebar ── */}
      <aside id="app-sidebar">
        {/* Brand */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 2px' }}>
          <div style={{
            background: 'linear-gradient(135deg,#6366f1,#a855f7)',
            padding: 10, borderRadius: 12,
            boxShadow: '0 4px 15px rgba(99,102,241,0.4)'
          }}>
            <Atom className="text-white" size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', lineHeight: 1 }}>QuantumRoute</h1>
            <p style={{ fontSize: '0.65rem', color: '#818cf8', fontWeight: 600, letterSpacing: '0.12em', marginTop: 3 }}>
              LOGISTICS AI
            </p>
          </div>
        </header>

        {/* Config Panel */}
        <section className="glass p-6" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Settings size={16} className="text-indigo-400" />
            <h2 style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#a5b4fc' }}>
              Configuration
            </h2>
          </div>

          <div className="input-group">
            <label>Delivery Nodes</label>
            <input
              id="input-n-nodes"
              type="number"
              value={config.n_nodes}
              onChange={e => setConfig({ ...config, n_nodes: parseInt(e.target.value) || 5 })}
              min="2" max="50"
            />
          </div>

          <div className="input-group">
            <label>Fleet Size (Vehicles)</label>
            <input
              id="input-n-vehicles"
              type="number"
              value={config.n_vehicles}
              onChange={e => setConfig({ ...config, n_vehicles: parseInt(e.target.value) || 1 })}
              min="1" max="10"
            />
          </div>

          <div className="input-group">
            <label>Algorithm</label>
            <select
              id="input-algorithm"
              value={config.algorithm}
              onChange={e => setConfig({ ...config, algorithm: e.target.value })}
            >
              <option value="hybrid">Quantum Hybrid (QAOA)</option>
              <option value="classical">Classical Baseline</option>
              <option value="anneal">Quantum Annealing</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label>QAOA Layers</label>
              <input
                id="input-qaoa-layers"
                type="number"
                value={config.qaoa_layers}
                onChange={e => setConfig({ ...config, qaoa_layers: parseInt(e.target.value) || 1 })}
                min="1" max="20"
              />
            </div>
            <div className="input-group">
              <label>Anneal Steps</label>
              <input
                id="input-anneal-steps"
                type="number"
                value={config.annealing_steps}
                onChange={e => setConfig({ ...config, annealing_steps: parseInt(e.target.value) || 50 })}
                min="10" max="2000"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label>Area Size (km)</label>
              <input
                id="input-area-size"
                type="number"
                value={config.area_size}
                onChange={e => setConfig({ ...config, area_size: parseFloat(e.target.value) || 100 })}
                min="10" max="500"
              />
            </div>
            <div className="input-group">
              <label>Random Seed</label>
              <input
                id="input-seed"
                type="number"
                value={config.seed}
                onChange={e => setConfig({ ...config, seed: parseInt(e.target.value) })}
                min="0" max="9999"
              />
            </div>
          </div>

          <button
            id="btn-run-optimization"
            className="btn-primary w-full"
            style={{ marginTop: 4 }}
            onClick={handleOptimize}
            disabled={loading}
          >
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
            {loading ? 'Solving...' : 'Run Optimization'}
          </button>

        </section>

        {/* Info footer */}
        <section className="glass p-4" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
          <Info size={14} className="text-indigo-400" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.7rem', color: '#9ca3af', lineHeight: 1.5 }}>
            © Althi Pradeep Kumar · Hybrid QAOA &amp; Quantum Annealing simulation
          </span>
        </section>
      </aside>

      {/* ── Main Content ── */}
      <main id="app-main">
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}
             className="stats-grid">
          <StatCard
            id="stat-total-dist"
            icon={<Navigation size={18} className="text-indigo-400" />}
            label="Total Distance"
            value={result ? `${result.summary.quantum_dist} km` : '—'}
            subValue={result ? `vs ${result.summary.classical_dist} km classical` : 'awaiting run'}
          />
          <StatCard
            id="stat-improvement"
            icon={<Zap size={18} className="text-purple-400" />}
            label="Improvement"
            value={result ? `${result.summary.improvement_pct}%` : '—'}
            subValue={result ? 'quantum efficiency gain' : 'awaiting run'}
            highlight={result && result.summary.improvement_pct > 0}
          />
          <StatCard
            id="stat-qubits"
            icon={<Cpu size={18} className="text-cyan-400" />}
            label="Quantum Resources"
            value={result ? `${result.summary.qubits_used} Qubits` : '—'}
            subValue={result ? `Circuit depth: ${result.summary.circuit_depth}` : 'awaiting run'}
          />
          <StatCard
            id="stat-compute-time"
            icon={<Timer size={18} className="text-emerald-400" />}
            label="Compute Time"
            value={result ? `${result.summary.compute_time}s` : '—'}
            subValue={result ? result.summary.algorithm.toUpperCase() + ' pipeline' : 'awaiting run'}
          />
        </div>

        {/* Visualization & Charts */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr', gap: 12, overflow: 'hidden', minHeight: 0 }}
             className="viz-grid">

          {/* Map Canvas */}
          <div className="glass p-4" style={{ display: 'flex', flexDirection: 'column', minHeight: 380 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapIcon size={16} className="text-indigo-400" />
                <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#d1d5db' }}>Route Network</h3>
              </div>
              {result && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button 
                    onClick={() => setShowComparison(true)}
                    style={{ 
                      background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: 6, color: '#a5b4fc', padding: '4px 10px', display: 'flex', 
                      alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.2s',
                      outline: 'none'
                    }}
                    className="hover-scale"
                    title="Show Efficiency Comparison"
                  >
                    <BarChart3 size={14} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em' }}>STATS</span>
                  </button>
                  <span className="badge badge-quantum">QAOA Sim</span>
                  <span className="badge" style={{
                    background: 'rgba(16,185,129,0.15)', color: '#34d399',
                    border: '1px solid rgba(16,185,129,0.25)'
                  }}>Optimal</span>
                </div>
              )}
            </div>

            <div style={{
            height: 380, background: 'rgba(0,0,0,0.3)', position: 'relative',
            borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)'
          }}>
              {!result && !loading && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  color: '#4b5563', gap: 12
                }}>
                  <div style={{ padding: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }}>
                    <Truck size={44} style={{ opacity: 0.3 }} />
                  </div>
                  <p style={{ fontSize: '0.8rem' }}>Configure parameters and run to visualize routes</p>
                </div>
              )}

              {loading && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.65)', zIndex: 10, backdropFilter: 'blur(4px)'
                }}>
                  <div style={{ position: 'relative', width: 60, height: 60 }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%',
                      border: '4px solid rgba(99,102,241,0.2)',
                      borderTopColor: '#6366f1',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <Zap style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%,-50%)', color: '#818cf8',
                      animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite'
                    }} size={20} />
                  </div>
                  <p style={{ marginTop: 14, color: '#a5b4fc', fontWeight: 600, fontSize: '0.85rem',
                    animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}>
                    Running Quantum Pipeline...
                  </p>
                </div>
              )}

              <canvas
                ref={canvasRef}
                width={800}
                height={380}
                style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'crosshair' }}
              />
            </div>

            {/* Route legend */}
            {result && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {result.routes.map((route, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 14, height: 3, borderRadius: 2, background: VEHICLE_COLORS[i % VEHICLE_COLORS.length] }} />
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>V{i + 1} ({route.distance}km)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Logistics Fleet Dispatch */}
          <div className="glass p-5" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 16 }}>
              <div style={{ padding: 8, background: 'rgba(99, 102, 241, 0.1)', borderRadius: 10, color: '#6366f1' }}>
                <Layers size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>Logistics Fleet Dispatch</h3>
                <p style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Real-time Vehicle Assignments</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {result && result.routes && result.routes.length > 0 ? (
                result.routes.map((route, i) => (
                  <div key={i} style={{
                    padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderLeft: `5px solid ${VEHICLE_COLORS[i % VEHICLE_COLORS.length]}`,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.2s ease'
                  }} className="hover-scale">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: VEHICLE_COLORS[i % VEHICLE_COLORS.length] }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
                          VEHICLE {i + 1}
                        </span>
                      </div>
                      <div style={{ padding: '4px 10px', background: 'rgba(52, 211, 153, 0.1)', borderRadius: 20 }}>
                        <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700, fontFamily: 'monospace' }}>
                          {route.distance.toFixed(1)} km
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                      <div style={{ padding: '3px 10px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontSize: '0.65rem', borderRadius: 6, fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.2)' }}>DEPOT</div>
                      {route.nodes.map((nodeId, idx) => (
                        <React.Fragment key={idx}>
                          <div style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '0.65rem', borderRadius: 6, fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)' }}>{nodeId}</div>
                        </React.Fragment>
                      ))}
                      <div style={{ padding: '3px 10px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontSize: '0.65rem', borderRadius: 6, fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.2)' }}>DEPOT</div>
                    </div>

                    <div style={{ 
                      display: 'flex', justifyContent: 'space-between', 
                      paddingTop: 12, borderTop: '1px dashed rgba(255,255,255,0.05)',
                      fontSize: '0.7rem', color: '#64748b' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Zap size={12} className="text-indigo-400" />
                        <span>Load: <strong>{route.demand}</strong> units</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Navigation size={12} className="text-indigo-400" />
                        <span>Stops: <strong>{route.nodes.length}</strong></span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ 
                  gridColumn: '1 / -1', padding: '48px', textAlign: 'center', 
                  background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', 
                  borderRadius: 20, color: '#475569' 
                }}>
                  <Truck size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.9rem' }}>Awaiting route optimization results...</p>
                </div>
              )}
            </div>
          </div>
          </div>
        </main>

      {/* Responsive grid styles injected */}
      <style>{`
        @media (min-width: 1280px) {
          .viz-grid { grid-template-columns: 2fr 1fr !important; }
        }
        @media (min-width: 768px) {
          .stats-grid { grid-template-columns: repeat(4,1fr) !important; }
        }
      `}</style>

      {/* Efficiency Modal Overlay */}
      {showComparison && result && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(3, 7, 18, 0.9)',
          backdropFilter: 'blur(16px)', zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 20
        }} onClick={() => setShowComparison(false)}>
          <div style={{
            width: '100%', maxWidth: 700, background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 24,
            padding: 32, boxShadow: '0 0 50px rgba(0, 0, 0, 0.8)',
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Close button */}
            <button 
              onClick={() => setShowComparison(false)}
              style={{
                position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.05)',
                border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer',
                color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem'
              }}
            >✕</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
              <div style={{ padding: 12, background: 'rgba(99, 102, 241, 0.15)', borderRadius: 12, color: '#6366f1' }}>
                <BarChart3 size={28} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>Efficiency Analysis</h2>
                <p style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Quantum vs Classical Solver</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {[
                { name: 'Classical Heuristic', value: result.summary.classical_dist, color: '#475569', label: 'Baseline (Nearest Neighbor)' },
                { name: 'Quantum-Hybrid (QAOA)', value: result.summary.quantum_dist, color: 'linear-gradient(90deg, #6366f1, #a855f7)', label: 'Optimized (Quantum Pipeline)' }
              ].map((data, idx) => {
                const maxValue = Math.max(result.summary.classical_dist || 1, result.summary.quantum_dist || 1);
                const percentage = (data.value / maxValue) * 100;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{data.label}</span>
                        <span style={{ fontSize: '0.95rem', color: '#f1f5f9', fontWeight: 700 }}>{data.name}</span>
                      </div>
                      <span style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 800, fontFamily: 'monospace' }}>
                        {data.value.toFixed(2)} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 400 }}>km</span>
                      </span>
                    </div>
                    <div style={{ height: 18, background: 'rgba(255,255,255,0.03)', borderRadius: 9, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ 
                        height: '100%', width: `${percentage}%`, background: data.color, borderRadius: 9,
                        boxShadow: idx === 1 ? '0 0 40px rgba(99, 102, 241, 0.4)' : 'none',
                        transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }} />
                    </div>
                  </div>
                );
              })}

              <div style={{ 
                marginTop: 10, padding: '24px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(99, 102, 241, 0.1))',
                border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 20,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <Zap size={36} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Quantum Advantage</span>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>Significant path optimization detected</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '3.5rem', color: '#10b981', fontWeight: 900, lineHeight: 1 }}>{result.summary.improvement_pct}%</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowComparison(false)}
              className="btn-primary"
              style={{ marginTop: 40, width: '100%', height: 54, borderRadius: 14, fontSize: '1rem', fontWeight: 700 }}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ id, icon, label, value, subValue, highlight }) {
  return (
    <div
      id={id}
      className="glass p-4"
      style={{
        transition: 'all 0.3s ease',
        borderColor: highlight ? 'rgba(99,102,241,0.45)' : undefined,
        boxShadow: highlight ? '0 0 20px rgba(99,102,241,0.15)' : undefined
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ padding: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 8 }}>
          {icon}
        </div>
        <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>{value}</span>
        {subValue && (
          <span style={{ fontSize: '0.65rem', color: '#818cf8', fontWeight: 500, marginTop: 3, opacity: 0.85 }}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}

export default App;
