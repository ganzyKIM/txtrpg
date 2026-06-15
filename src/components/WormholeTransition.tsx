import { useEffect, useRef, useState } from 'react';

interface Props {
  /** true면 웜홀이 나타나 가속(워프)하고, false가 되면 페이드아웃 후 사라진다 */
  active: boolean;
  /** 전환 중 보여줄 목적지 이름(모험 제목 등) */
  label?: string;
}

interface Streak {
  x: number;
  y: number;
  px: number;
  py: number;
  bluish: boolean;
}

/**
 * 웜홀(하이퍼스페이스) 화면 전환.
 * 중심에서 별빛이 가속하며 바깥으로 뻗어나가, 마치 터널을 통과하는 듯한 연출.
 */
export default function WormholeTransition({ active, label }: Props) {
  const [show, setShow] = useState(false);
  const [fading, setFading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // active 토글에 따라 마운트/페이드아웃 수명 관리
  useEffect(() => {
    if (active) {
      setShow(true);
      setFading(false);
    } else if (show) {
      setFading(true);
      const t = window.setTimeout(() => setShow(false), 650);
      return () => window.clearTimeout(t);
    }
  }, [active, show]);

  useEffect(() => {
    if (!show) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let cx = 0;
    let cy = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let streaks: Streak[] = [];
    let warp = 0.25; // 가속 램프 (시작 시 천천히 → 빠르게)
    const start = performance.now();

    function spawn(): Streak {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 40 + 4;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      return { x, y, px: x, py: y, bluish: Math.random() < 0.4 };
    }

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      cx = w / 2;
      cy = h / 2;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(520, Math.floor((w * h) / 3400));
      streaks = Array.from({ length: count }, spawn);
    }

    function frame() {
      const elapsed = performance.now() - start;
      // 1.1초에 걸쳐 워프 가속도가 최대로
      warp = 0.25 + Math.min(1, elapsed / 1100) * 1.6;

      // 잔상 트레일: 완전 지우지 않고 어둡게 덮어 streak 꼬리를 남긴다
      ctx!.fillStyle = 'rgba(3,4,12,0.32)';
      ctx!.fillRect(0, 0, w, h);

      const maxR = Math.hypot(cx, cy) + 30;
      ctx!.lineCap = 'round';
      for (const s of streaks) {
        s.px = s.x;
        s.py = s.y;
        const r = Math.hypot(s.x, s.y) || 1;
        const speed = (1.2 + r * 0.052) * warp;
        s.x += (s.x / r) * speed;
        s.y += (s.y / r) * speed;

        if (r > maxR) {
          const n = spawn();
          s.x = n.x; s.y = n.y; s.px = n.x; s.py = n.y; s.bluish = n.bluish;
          continue;
        }

        const alpha = Math.min(1, 0.15 + r / maxR);
        const width = Math.min(2.6, 0.5 + r / maxR * 2.4);
        ctx!.strokeStyle = s.bluish
          ? `rgba(150,195,255,${alpha})`
          : `rgba(255,255,255,${alpha})`;
        ctx!.lineWidth = width;
        ctx!.beginPath();
        ctx!.moveTo(cx + s.px, cy + s.py);
        ctx!.lineTo(cx + s.x, cy + s.y);
        ctx!.stroke();
      }

      // 중심 발광
      const glowR = 70 + Math.sin(elapsed / 200) * 14;
      const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      g.addColorStop(0, 'rgba(190,215,255,0.55)');
      g.addColorStop(0.5, 'rgba(110,150,255,0.18)');
      g.addColorStop(1, 'rgba(110,150,255,0)');
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx!.fill();

      raf = requestAnimationFrame(frame);
    }

    resize();
    // 첫 프레임 배경
    ctx.fillStyle = '#03040c';
    ctx.fillRect(0, 0, w, h);
    frame();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className={`wormhole-overlay${fading ? ' fading' : ''}`} aria-hidden="true">
      <canvas ref={canvasRef} className="wormhole-canvas" />
      <div className="wormhole-text">
        <span className="wormhole-spinner" />
        <span className="wormhole-label">
          {label ? `『${label}』(으)로 진입하는 중` : '세계의 문을 여는 중'}
        </span>
      </div>
    </div>
  );
}
