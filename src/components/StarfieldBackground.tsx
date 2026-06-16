import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  dvx: number;
  dvy: number;
  px: number;
  py: number;
  r: number;
  baseA: number;
  tw: number;
  twSpeed: number;
}

export type RGB = [number, number, number];

/** 선택에 따라 배경 우주에 번지는 색 물감 한 방울 */
export interface Tint {
  key: string;
  color: RGB;
  /** 번짐 중심 (0~1 비율 좌표) */
  fx: number;
  fy: number;
}

interface Blob {
  color: RGB;
  target: RGB;
  fx: number;
  fy: number;
  t0: number;
  alive: boolean;
  deadAt: number;
}

const SPREAD_MS = 3200; // 물감이 최대로 퍼지는 데 걸리는 시간 (천천히)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * 마우스와 상호작용하는 우주 파티클 배경.
 * 별들이 화면 전체를 가로지르는 큰 조류를 타며 흐르고,
 * `tints`가 주어지면 그 색이 물 위에 떨어진 물감처럼 일부 지점에서 천천히 번져 조합된다.
 */
export default function StarfieldBackground({ tints }: { tints?: Tint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tintsRef = useRef<Tint[]>([]);
  const blobsRef = useRef<Map<string, Blob>>(new Map());

  // 렌더마다 최신 tints를 ref로 동기화 (애니메이션 루프가 읽음)
  tintsRef.current = tints ?? [];

  useEffect(() => {
    const now = performance.now();
    const blobs = blobsRef.current;
    const incoming = new Map((tints ?? []).map((t) => [t.key, t]));
    // 추가/갱신
    for (const t of tints ?? []) {
      const existing = blobs.get(t.key);
      if (existing) {
        existing.target = t.color;
        existing.fx = t.fx;
        existing.fy = t.fy;
        existing.alive = true;
      } else {
        blobs.set(t.key, {
          color: t.color,
          target: t.color,
          fx: t.fx,
          fy: t.fy,
          t0: now,
          alive: true,
          deadAt: 0,
        });
      }
    }
    // 제거된 키는 페이드아웃 표시
    for (const [key, b] of blobs) {
      if (!incoming.has(key) && b.alive) {
        b.alive = false;
        b.deadAt = now;
      }
    }
  }, [tints]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let stars: Star[] = [];
    const mouse = { x: -9999, y: -9999, active: false };

    let flowAngle = Math.random() * Math.PI * 2;
    const FLOW_SPEED = 0.28;
    const FLOW_TURN = 0.00018;

    const LINK = 130;
    const MOUSE_R = 180;
    const PUSH = 26;

    function initStars() {
      const count = Math.min(280, Math.floor((w * h) / 5200));
      stars = Array.from({ length: count }, () => {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.06 + 0.02;
        return {
          x, y, px: x, py: y,
          dvx: Math.cos(angle) * speed,
          dvy: Math.sin(angle) * speed,
          r: Math.random() * 1.5 + 0.4,
          baseA: Math.random() * 0.5 + 0.35,
          tw: Math.random() * Math.PI * 2,
          twSpeed: Math.random() * 0.018 + 0.004,
        };
      });
    }

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars();
    }

    function drawTints(now: number) {
      const blobs = blobsRef.current;
      if (blobs.size === 0) return;
      const maxR = Math.max(w, h) * 0.72;
      ctx!.globalCompositeOperation = 'lighter';
      for (const [key, b] of blobs) {
        // 타깃 색으로 부드럽게 보간
        b.color = [
          lerp(b.color[0], b.target[0], 0.04),
          lerp(b.color[1], b.target[1], 0.04),
          lerp(b.color[2], b.target[2], 0.04),
        ];
        const age = now - b.t0;
        const grow = easeOut(Math.min(1, age / SPREAD_MS));
        const r = Math.max(1, maxR * grow);
        // 페이드 인(0.6s) · 페이드 아웃
        let alpha = Math.min(1, age / 600) * 0.34;
        if (!b.alive) {
          const dead = (now - b.deadAt) / 900;
          alpha *= Math.max(0, 1 - dead);
          if (dead >= 1) {
            blobs.delete(key);
            continue;
          }
        }
        const cx = b.fx * w;
        const cy = b.fy * h;
        const [cr, cg, cb] = b.color.map((v) => Math.round(v));
        const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha})`);
        grad.addColorStop(0.45, `rgba(${cr},${cg},${cb},${alpha * 0.45})`);
        grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, w, h);
      }
      ctx!.globalCompositeOperation = 'source-over';
    }

    function frame() {
      const now = performance.now();
      ctx!.clearRect(0, 0, w, h);

      // 0) 색 물감 번짐 (별 뒤 배경)
      drawTints(now);

      flowAngle += FLOW_TURN;
      const flowX = Math.cos(flowAngle) * FLOW_SPEED;
      const flowY = Math.sin(flowAngle) * FLOW_SPEED;

      for (const s of stars) {
        s.x += flowX + s.dvx;
        s.y += flowY + s.dvy;
        if (s.x < -20) s.x = w + 20;
        else if (s.x > w + 20) s.x = -20;
        if (s.y < -20) s.y = h + 20;
        else if (s.y > h + 20) s.y = -20;
        s.tw += s.twSpeed;

        s.px = s.x;
        s.py = s.y;
        if (mouse.active) {
          const dx = s.x - mouse.x;
          const dy = s.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MOUSE_R * MOUSE_R) {
            const d = Math.sqrt(d2) || 1;
            const force = (1 - d / MOUSE_R) ** 2;
            s.px = s.x + (dx / d) * force * PUSH;
            s.py = s.y + (dy / d) * force * PUSH;
          }
        }
      }

      ctx!.lineWidth = 0.6;
      for (let i = 0; i < stars.length; i++) {
        const a = stars[i];
        for (let j = i + 1; j < stars.length; j++) {
          const b = stars[j];
          const dx = a.px - b.px;
          const dy = a.py - b.py;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            const al = (1 - Math.sqrt(d2) / LINK) * 0.13;
            ctx!.strokeStyle = `rgba(150,180,255,${al})`;
            ctx!.beginPath();
            ctx!.moveTo(a.px, a.py);
            ctx!.lineTo(b.px, b.py);
            ctx!.stroke();
          }
        }
      }

      if (mouse.active) {
        ctx!.lineWidth = 0.7;
        for (const s of stars) {
          const dx = mouse.x - s.px;
          const dy = mouse.y - s.py;
          const d2 = dx * dx + dy * dy;
          if (d2 < MOUSE_R * MOUSE_R) {
            const al = (1 - Math.sqrt(d2) / MOUSE_R) * 0.45;
            ctx!.strokeStyle = `rgba(190,215,255,${al})`;
            ctx!.beginPath();
            ctx!.moveTo(mouse.x, mouse.y);
            ctx!.lineTo(s.px, s.py);
            ctx!.stroke();
          }
        }
      }

      ctx!.shadowColor = 'rgba(180,205,255,0.9)';
      for (const s of stars) {
        let a = s.baseA + Math.sin(s.tw) * 0.28;
        if (mouse.active) {
          const dx = mouse.x - s.px;
          const dy = mouse.y - s.py;
          const d2 = dx * dx + dy * dy;
          if (d2 < MOUSE_R * MOUSE_R) {
            a += (1 - Math.sqrt(d2) / MOUSE_R) * 0.55;
          }
        }
        a = Math.max(0, Math.min(1, a));
        ctx!.beginPath();
        ctx!.arc(s.px, s.py, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,255,255,${a})`;
        ctx!.shadowBlur = s.r * 3.5;
        ctx!.fill();
      }
      ctx!.shadowBlur = 0;

      raf = requestAnimationFrame(frame);
    }

    function onMove(e: MouseEvent) {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
    }
    function onLeave() {
      mouse.active = false; mouse.x = -9999; mouse.y = -9999;
    }
    function onTouch(e: TouchEvent) {
      const t = e.touches[0];
      if (t) { mouse.x = t.clientX; mouse.y = t.clientY; mouse.active = true; }
    }

    resize();
    frame();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseout', onLeave);
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('touchend', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('touchend', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}
