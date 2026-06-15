import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  px: number; // 마우스 반발이 적용된 표시 좌표
  py: number;
  r: number;
  baseA: number;
  tw: number; // 반짝임 위상
  twSpeed: number;
}

/**
 * 마우스와 상호작용하는 우주 파티클 배경.
 * 무수한 별들이 유기적으로 떠다니고, 가까운 별끼리 성좌처럼 연결되며,
 * 커서 주변의 별들은 밝아지고 부드럽게 흩어진다.
 */
export default function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const LINK = 120; // 성좌 연결 거리
    const MOUSE_R = 180; // 마우스 영향 반경
    const PUSH = 26; // 마우스 반발 세기(px)

    function initStars() {
      const count = Math.min(280, Math.floor((w * h) / 5200));
      stars = Array.from({ length: count }, () => {
        const x = Math.random() * w;
        const y = Math.random() * h;
        // 최소 속도를 보장해 멈춰 있는 별 없이 역동적으로 흐르게 한다
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.4 + 0.22;
        return {
          x,
          y,
          px: x,
          py: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: Math.random() * 1.5 + 0.4,
          baseA: Math.random() * 0.5 + 0.35,
          tw: Math.random() * Math.PI * 2,
          twSpeed: Math.random() * 0.022 + 0.005,
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

    function frame() {
      ctx!.clearRect(0, 0, w, h);

      // 1) 기본 드리프트 + 래핑 + 반짝임, 그리고 마우스 반발 표시좌표 계산
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
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

      // 2) 성좌 연결선
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

      // 3) 커서에서 가까운 별로 이어지는 빛줄기
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

      // 4) 별 본체 (반짝임 + 커서 근처 발광)
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
        if (a < 0) a = 0;
        else if (a > 1) a = 1;
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
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }
    function onLeave() {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    }
    function onTouch(e: TouchEvent) {
      const t = e.touches[0];
      if (t) {
        mouse.x = t.clientX;
        mouse.y = t.clientY;
        mouse.active = true;
      }
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
