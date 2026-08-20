/* ======================================================
   خلفية متحركة: شبكة جسيمات متوهجة + خطوط ضوئية عابرة
   (بدون أي مكتبات خارجية، أداء خفيف يناسب الجوال أيضاً)
   ====================================================== */
(function () {
  const canvas = document.createElement("canvas");
  canvas.id = "bgCanvas";
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext("2d");
  const COLOR = "31,216,196"; // نفس لون التركوازي المعتمد في هوية الموقع
  let w, h, particles, streaks, lastStreak;

  function isMobile() {
    return window.innerWidth < 720;
  }

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", () => {
    resize();
    initParticles();
  });

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function initParticles() {
    const count = isMobile() ? 32 : 60;
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: rand(0, w),
        y: rand(0, h),
        vx: rand(-0.15, 0.15),
        vy: rand(-0.12, 0.12),
        r: rand(1, 2.6),
      });
    }
  }

  resize();
  initParticles();
  streaks = [];
  lastStreak = 0;

  function spawnStreak() {
    streaks.push({
      x: rand(0, w * 0.7),
      y: -20,
      vx: rand(2, 3.4),
      vy: rand(2.4, 3.8),
      len: rand(90, 170),
      life: 0,
      maxLife: rand(45, 75),
    });
  }

  const MAX_DIST = 130;

  function step(ts) {
    ctx.clearRect(0, 0, w, h);

    // تحريك الجسيمات وارتدادها عند الحواف
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }

    // خطوط اتصال بين الجسيمات المتقاربة (تأثير الشبكة/الكوكبة)
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const alpha = (1 - dist / MAX_DIST) * 0.2;
          ctx.strokeStyle = `rgba(${COLOR},${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // الجسيمات المتوهجة نفسها
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${COLOR},0.9)`;
      ctx.shadowColor = `rgba(${COLOR},0.9)`;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // خطوط ضوئية عابرة (نجوم متساقطة) بين الحين والآخر
    if (ts - lastStreak > rand(3000, 6000)) {
      spawnStreak();
      lastStreak = ts;
    }
    for (let i = streaks.length - 1; i >= 0; i--) {
      const s = streaks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life++;
      const alpha = Math.max(0, 1 - s.life / s.maxLife);
      const tailX = s.x - s.len * (s.vx / 4);
      const tailY = s.y - s.len * (s.vy / 4);
      const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      if (s.life > s.maxLife || s.y > h + 50) streaks.splice(i, 1);
    }

    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();
