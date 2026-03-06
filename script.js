/* === JS Block 1 === */
// ════════════════════════════════════════════════════════
    //   STATE
    // ════════════════════════════════════════════════════════
    let scale = 1, panX = 0, panY = 0, rotation = 0, fH = false, fV = false;
    let dragging = false, dsx = 0, dsy = 0;
    let natW = 0, natH = 0, loaded = false;
    let gridOn = false, mmOn = false, panelOn = false, xhOn = false;
    let curTheme = '';

    // Feature flags — all enabled by default
    const features = {
      statusbar: true,
      coords: true,
      hints: true,
      filename: true,
      ambientBG: true,
      toast: true,
      zoomInd: true,
      ctxMenu: true,
      dblclick: true,
      autofit: true,
      smoothzoom: true
    };

    // DOM refs
    const VP = document.getElementById('viewport');
    const IW = document.getElementById('imgWrapper');
    const IMG = document.getElementById('mapImage');
    const DZ = document.getElementById('dropZone');
    const ZL = document.getElementById('zoomLabel');
    const MM = document.getElementById('minimap');
    const MMI = document.getElementById('minimapImg');
    const MMVP = document.getElementById('minimapVP');
    const GO = document.getElementById('gridOverlay');
    const XH = document.getElementById('crosshair');
    const TOAST = document.getElementById('toast');
    const ZIND = document.getElementById('zoomInd');
    const CTX = document.getElementById('ctxMenu');

    // ════════════════════════════════════════════════════════
    //   RENDER
    // ════════════════════════════════════════════════════════
    function render() {
      const sx = fH ? -1 : 1, sy = fV ? -1 : 1;
      IW.style.transform = `translate(${panX}px,${panY}px) rotate(${rotation}deg) scale(${scale * sx},${scale * sy})`;
      const p = Math.round(scale * 100) + '%';
      ZL.textContent = p;
      document.getElementById('zoomStat').textContent = p;
      document.getElementById('infoZoom').textContent = p;
      document.getElementById('infoRot').textContent = rotation + '°';
      document.getElementById('infoPX').textContent = Math.round(panX);
      document.getElementById('infoPY').textContent = Math.round(panY);
      document.getElementById('infoFlip').textContent = (fH && fV) ? 'H + V' : fH ? 'Horizontal' : fV ? 'Vertical' : 'None';
      updMM();
    }

    // ════════════════════════════════════════════════════════
    //   ZOOM
    // ════════════════════════════════════════════════════════
    let ziT;
    function zoom(d, cx, cy) {
      if (!loaded) return;
      const vw = VP.clientWidth, vh = VP.clientHeight;
      cx = cx ?? vw / 2; cy = cy ?? vh / 2;
      const old = scale;
      scale = Math.min(12, Math.max(0.04, scale * (1 + d)));
      const r = scale / old;
      panX = cx - (cx - panX) * r;
      panY = cy - (cy - panY) * r;
      render();
      if (features.zoomInd) {
        ZIND.textContent = Math.round(scale * 100) + '%';
        ZIND.classList.add('on');
        clearTimeout(ziT);
        ziT = setTimeout(() => ZIND.classList.remove('on'), 660);
      }
    }

    function zoomTo(t, cx, cy) {
      if (!loaded) return;
      const vw = VP.clientWidth, vh = VP.clientHeight;
      cx = cx ?? vw / 2; cy = cy ?? vh / 2;
      const r = t / scale;
      panX = cx - (cx - panX) * r;
      panY = cy - (cy - panY) * r;
      scale = t; render();
    }

    // ════════════════════════════════════════════════════════
    //   PAN & MOUSE EVENTS
    // ════════════════════════════════════════════════════════
    VP.addEventListener('mousedown', e => {
      if (!loaded || e.button !== 0) return;
      dragging = true; dsx = e.clientX - panX; dsy = e.clientY - panY;
      VP.classList.add('grabbing'); VP.classList.remove('grab');
    });

    window.addEventListener('mousemove', e => {
      if (loaded && features.coords) {
        const topH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--topH'));
        document.getElementById('coordDisplay').textContent =
          'X: ' + Math.round((e.clientX - panX) / scale) +
          '   Y: ' + Math.round((e.clientY - topH - panY) / scale);
      }
      if (xhOn) { XH.style.left = e.clientX + 'px'; XH.style.top = (e.clientY - 56) + 'px'; }
      if (!dragging) return;
      panX = e.clientX - dsx; panY = e.clientY - dsy; render();
    });

    window.addEventListener('mouseup', () => {
      dragging = false;
      VP.classList.remove('grabbing');
      if (loaded) VP.classList.add('grab');
    });

    VP.addEventListener('wheel', e => {
      e.preventDefault();
      const r = VP.getBoundingClientRect();
      zoom(e.deltaY < 0 ? 0.12 : -0.12, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    // Touch support
    let ltd = 0;
    VP.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        ltd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      } else if (e.touches.length === 1 && loaded) {
        dragging = true; dsx = e.touches[0].clientX - panX; dsy = e.touches[0].clientY - panY;
      }
    }, { passive: true });

    VP.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        zoom((d - ltd) / ltd * 0.8,
          (e.touches[0].clientX + e.touches[1].clientX) / 2,
          (e.touches[0].clientY + e.touches[1].clientY) / 2);
        ltd = d;
      } else if (dragging) {
        panX = e.touches[0].clientX - dsx;
        panY = e.touches[0].clientY - dsy; render();
      }
    }, { passive: false });

    VP.addEventListener('touchend', () => dragging = false);
    VP.addEventListener('dblclick', () => { if (features.dblclick && loaded) fitToScreen(); });

    // Context menu
    VP.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (!loaded || !features.ctxMenu) return;
      CTX.style.left = Math.min(e.clientX, window.innerWidth - 180) + 'px';
      CTX.style.top = Math.min(e.clientY, window.innerHeight - 310) + 'px';
      CTX.classList.add('open');
    });
    document.addEventListener('click', () => CTX.classList.remove('open'));
    function closeCtx() { CTX.classList.remove('open'); }

    // Drag & drop files
    document.addEventListener('dragover', e => { e.preventDefault(); if (!loaded) DZ.classList.add('dragover'); });
    document.addEventListener('dragleave', () => DZ.classList.remove('dragover'));
    document.addEventListener('drop', e => {
      e.preventDefault(); DZ.classList.remove('dragover');
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) handleFile(f);
    });

    // ════════════════════════════════════════════════════════
    //   FILE HANDLING
    // ════════════════════════════════════════════════════════
    function handleFile(file) {
      if (!file) return;
      showLB();
      const reader = new FileReader();
      reader.onload = ev => {
        const src = ev.target.result;
        IMG.src = src;
        IMG.onload = () => {
          natW = IMG.naturalWidth; natH = IMG.naturalHeight;
          loaded = true;
          DZ.classList.add('hidden');
          VP.classList.add('grab');
          IW.style.width = natW + 'px';
          IW.style.height = natH + 'px';
          IW.style.transformOrigin = 'top left';

          const fmtStr = file.type.split('/')[1].toUpperCase();
          const sizeStr = fmtB(file.size);

          // Status bar
          document.getElementById('imgSize').textContent = natW + ' × ' + natH + ' px';
          document.getElementById('imgFmt').textContent = fmtStr;
          document.getElementById('imgFS').textContent = sizeStr;

          // Info panel
          document.getElementById('infoDim').textContent = natW + ' × ' + natH;
          document.getElementById('infoFmt').textContent = fmtStr;
          document.getElementById('infoFS').textContent = sizeStr;
          document.getElementById('infoName').textContent = file.name;

          if (features.filename)
            document.getElementById('filenameBar').textContent = '📄 ' + file.name;

          document.getElementById('fsBtn').style.display = 'flex';
          document.getElementById('clearBtn').style.display = 'flex';

          if (mmOn) MMI.src = src;

          hideLB();
          if (features.autofit) fitToScreen();
          toast('✅ Loaded: ' + file.name);
        };
        IMG.onerror = () => { hideLB(); toast('❌ Image load failed!'); };
      };
      reader.readAsDataURL(file);
    }

    function fmtB(b) {
      if (b < 1024) return b + ' B';
      if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
      return (b / 1048576).toFixed(1) + ' MB';
    }

    function timeAgo(ts) {
      const d = (Date.now() - ts) / 1000;
      if (d < 60) return 'just now';
      if (d < 3600) return Math.floor(d / 60) + 'm ago';
      if (d < 86400) return Math.floor(d / 3600) + 'h ago';
      return Math.floor(d / 86400) + 'd ago';
    }

    // Load progress bar
    let lbT;
    function showLB() {
      const lb = document.getElementById('loadBar');
      lb.style.display = 'block'; lb.style.transform = 'scaleX(0)';
      requestAnimationFrame(() => lb.style.transform = 'scaleX(0.72)');
    }
    function hideLB() {
      const lb = document.getElementById('loadBar');
      lb.style.transform = 'scaleX(1)';
      clearTimeout(lbT);
      lbT = setTimeout(() => { lb.style.display = 'none'; lb.style.transform = 'scaleX(0)'; }, 380);
    }

    // ════════════════════════════════════════════════════════
    //   VIEW CONTROLS
    // ════════════════════════════════════════════════════════
    function fitToScreen() {
      if (!loaded) return;
      const vw = VP.clientWidth, vh = VP.clientHeight;
      const rot90 = rotation % 180 !== 0;
      const iw = rot90 ? natH : natW, ih = rot90 ? natW : natH;
      scale = Math.min((vw - 80) / iw, (vh - 80) / ih, 1);
      panX = (vw - iw * scale) / 2;
      panY = (vh - ih * scale) / 2;
      render(); toast('📐 Fit to screen');
    }

    function resetView() { scale = 1; panX = 60; panY = 60; render(); toast('↺ View reset'); }

    function rotateImg() {
      rotation = (rotation + 90) % 360;
      document.getElementById('rotD').textContent = rotation + '°';
      render(); toast('🔄 Rotated to ' + rotation + '°');
    }

    function rotateBy(deg) {
      rotation = ((rotation + deg) % 360 + 360) % 360;
      document.getElementById('rotD').textContent = rotation + '°';
      render(); toast('↩ Rotated to ' + rotation + '°');
    }

    function flipH() { fH = !fH; render(); toast(fH ? '↔ Flipped H' : '↔ Unflipped H'); }
    function flipV() { fV = !fV; render(); toast(fV ? '↕ Flipped V' : '↕ Unflipped V'); }

    // ════════════════════════════════════════════════════════
    //   FILTERS
    // ════════════════════════════════════════════════════════
    function applyF() {
      const b = document.getElementById('brt').value;
      const c = document.getElementById('con').value;
      const s = document.getElementById('sat').value;
      const bl = document.getElementById('blr').value;
      const h = document.getElementById('hue').value;
      const sh = document.getElementById('shrp').value;
      const o = document.getElementById('op').value;
      document.getElementById('brtV').textContent = b + '%';
      document.getElementById('conV').textContent = c + '%';
      document.getElementById('satV').textContent = s + '%';
      document.getElementById('blrV').textContent = bl + 'px';
      document.getElementById('hueV').textContent = h + '°';
      document.getElementById('shrpV').textContent = sh;
      document.getElementById('opV').textContent = o + '%';
      IMG.style.filter = `${curTheme} brightness(${b}%) contrast(${c * (1 + sh * 0.06)}%) saturate(${s}%) blur(${bl}px) hue-rotate(${h}deg) opacity(${o}%)`;
    }

    function resetF() {
      ['brt', 'con', 'sat'].forEach(i => document.getElementById(i).value = 100);
      ['blr', 'hue', 'shrp'].forEach(i => document.getElementById(i).value = 0);
      document.getElementById('op').value = 100;
      curTheme = ''; applyF();
      document.querySelectorAll('#imgThemeGrid .tgbtn').forEach(b => b.classList.remove('on'));
      document.querySelector('#imgThemeGrid .tgbtn').classList.add('on');
      toast('🎨 Filters reset');
    }

    const THEMES = {
      normal: '',
      invert: 'invert(1)',
      sepia: 'sepia(1)',
      grayscale: 'grayscale(1)',
      warm: 'sepia(0.4) saturate(1.3)',
      cool: 'hue-rotate(200deg) saturate(0.85)',
      vivid: 'saturate(2) contrast(1.2)',
      neon: 'saturate(3) hue-rotate(270deg) contrast(1.3)',
      vintage: 'sepia(0.6) saturate(0.8) brightness(0.9) contrast(1.1)',
      midnight: 'hue-rotate(240deg) saturate(1.5) brightness(0.7)'
    };

    function applyTheme(t) {
      curTheme = THEMES[t] || '';
      applyF();
      document.querySelectorAll('#imgThemeGrid .tgbtn').forEach(b => b.classList.remove('on'));
      const idx = Object.keys(THEMES).indexOf(t);
      const btns = document.querySelectorAll('#imgThemeGrid .tgbtn');
      if (idx >= 0 && btns[idx]) btns[idx].classList.add('on');
      toast('🎨 Theme: ' + t);
    }

    function applyShad() {
      const v = document.getElementById('shadowR').value;
      document.getElementById('shadowV').textContent = v + '%';
      IW.style.filter = `drop-shadow(0 20px ${v * 0.55}px rgba(0,0,0,${v / 100}))`;
    }

    function autoEnhance() {
      document.getElementById('brt').value = 108;
      document.getElementById('con').value = 115;
      document.getElementById('sat').value = 120;
      document.getElementById('shrp').value = 1;
      applyF(); toast('✨ Auto enhanced!');
    }

    // ════════════════════════════════════════════════════════
    //   FOCUS MODE
    // ════════════════════════════════════════════════════════
    function toggleFocus() {
      document.body.classList.toggle('focus-mode');
      if (document.body.classList.contains('focus-mode')) toast('🎯 Focus Mode ON (Esc to exit)');
      else toast('🎯 Focus Mode OFF');
      setTimeout(render, 50);
    }

    // ════════════════════════════════════════════════════════
    //   MINIMAP
    // ════════════════════════════════════════════════════════
    function toggleMinimap() {
      mmOn = !mmOn;
      MM.style.display = mmOn ? 'block' : 'none';
      document.getElementById('mmBtn').classList.toggle('active', mmOn);
      document.getElementById('vpMap').classList.toggle('on', mmOn);
      if (mmOn && loaded) MMI.src = IMG.src;
      toast(mmOn ? '🗺️ Minimap ON' : '🗺️ Minimap OFF');
    }

    function updMM() {
      if (!mmOn || !loaded) return;
      const mW = MM.clientWidth, mH = MM.clientHeight;
      const vw = VP.clientWidth, vh = VP.clientHeight;
      const nW = natW * scale, nH = natH * scale;
      MMVP.style.width = Math.min(mW, Math.max(4, vw / nW * mW)) + 'px';
      MMVP.style.height = Math.min(mH, Math.max(4, vh / nH * mH)) + 'px';
      MMVP.style.left = Math.max(0, Math.min(mW - 4, -panX / nW * mW)) + 'px';
      MMVP.style.top = Math.max(0, Math.min(mH - 4, -panY / nH * mH)) + 'px';
    }

    // ════════════════════════════════════════════════════════
    //   GRID & CROSSHAIR
    // ════════════════════════════════════════════════════════
    function toggleGrid() {
      gridOn = !gridOn;
      GO.classList.toggle('on', gridOn);
      document.getElementById('gridBtn').classList.toggle('active', gridOn);
      document.getElementById('vpGrid').classList.toggle('on', gridOn);
      toast(gridOn ? '📐 Grid ON' : '📐 Grid OFF');
    }

    function toggleCrosshair() {
      xhOn = !xhOn;
      VP.classList.toggle('xhMode', xhOn);
      document.getElementById('xhBtn').classList.toggle('active', xhOn);
      document.getElementById('vpXH').classList.toggle('on', xhOn);
      toast(xhOn ? '➕ Crosshair ON' : '➕ Crosshair OFF');
    }

    // ════════════════════════════════════════════════════════
    //   PANELS
    // ════════════════════════════════════════════════════════
    function togglePanel() {
      panelOn = !panelOn;
      document.getElementById('adjustPanel').classList.toggle('open', panelOn);
      document.getElementById('adjBtn').classList.toggle('active', panelOn);
    }

    function switchTab(id) {
      document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-' + id).classList.add('active');
      document.getElementById('tc-' + id).classList.add('active');
    }

    // ════════════════════════════════════════════════════════
    //   FULLSCREEN
    // ════════════════════════════════════════════════════════
    function toggleFS() {
      if (!document.fullscreenElement)
        document.documentElement.requestFullscreen().catch(() => { });
      else document.exitFullscreen();
    }
    document.addEventListener('fullscreenchange', () => {
      const b = document.getElementById('fsBtn');
      b.innerHTML = document.fullscreenElement
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg> Exit`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> Full`;
    });

    // ════════════════════════════════════════════════════════
    //   SNAPSHOT
    // ════════════════════════════════════════════════════════
    function downloadSnap() {
      if (!loaded) { toast('⚠️ Pehle image upload karein'); return; }
      const c = document.createElement('canvas');
      c.width = natW; c.height = natH;
      const ctx = c.getContext('2d');
      ctx.filter = IMG.style.filter || 'none';
      ctx.drawImage(IMG, 0, 0);
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = 'mindmap-snap.png'; a.click();
      toast('💾 Snapshot saved!');
    }

    // ════════════════════════════════════════════════════════
    //   CLEAR IMAGE
    // ════════════════════════════════════════════════════════
    function clearImg() {
      IMG.src = ''; MMI.src = ''; loaded = false;
      scale = 1; panX = 0; panY = 0; rotation = 0; fH = false; fV = false;
      DZ.classList.remove('hidden');
      VP.classList.remove('grab', 'grabbing', 'xhMode');
      if (xhOn) {
        xhOn = false;
        document.getElementById('xhBtn').classList.remove('active');
        document.getElementById('vpXH').classList.remove('on');
      }
      document.getElementById('fsBtn').style.display = 'none';
      document.getElementById('clearBtn').style.display = 'none';
      document.getElementById('filenameBar').textContent = '';
      ['imgSize', 'imgFmt', 'imgFS', 'infoDim', 'infoFmt', 'infoFS', 'infoName'].forEach(i =>
        document.getElementById(i).textContent = '—');
      document.getElementById('rotD').textContent = '0°';
      document.getElementById('zoomStat').textContent = '100%';
      document.getElementById('infoZoom').textContent = '100%';
      document.getElementById('infoRot').textContent = '0°';
      document.getElementById('infoPX').textContent = '0';
      document.getElementById('infoPY').textContent = '0';
      document.getElementById('infoFlip').textContent = 'None';
      if (mmOn) toggleMinimap();
      if (panelOn) togglePanel();
      resetF(); ZL.textContent = '100%';
      toast('🗑️ Image cleared');
    }

    // ════════════════════════════════════════════════════════
    //   SETTINGS MODAL
    // ════════════════════════════════════════════════════════
    function toggleSettings() {
      document.getElementById('settingsOv').classList.toggle('open');
    }

    function toggleFeature(key) {
      features[key] = document.getElementById('sw-' + key).checked;
      applyFeatureChange(key);
    }

    function applyFeatureChange(key) {
      switch (key) {
        case 'statusbar':
          document.getElementById('statusbar').style.display = features.statusbar ? 'flex' : 'none';
          document.documentElement.style.setProperty('--botH', features.statusbar ? '44px' : '0px');
          break;
        case 'coords':
          document.getElementById('coordDisplay').style.display = features.coords ? '' : 'none';
          break;
        case 'hints':
          document.getElementById('hintText').style.display = features.hints ? '' : 'none';
          break;
        case 'filename':
          document.getElementById('filenameBar').style.display = features.filename ? '' : 'none';
          break;
        case 'ambientBG':
          document.body.classList.toggle('no-ambient', !features.ambientBG);
          break;
        case 'smoothzoom':
          IW.style.transition = features.smoothzoom ? 'transform 0.07s ease-out' : 'none';
          break;
      }
    }

    // ════════════════════════════════════════════════════════
    //   PAGE THEMES & ACCENT COLORS
    // ════════════════════════════════════════════════════════
    function setPageTheme(theme, swId) {
      document.body.classList.remove('theme-light', 'theme-navy', 'theme-forest', 'theme-amoled', 'theme-slate');
      if (theme !== 'default') document.body.classList.add('theme-' + theme);
      document.querySelectorAll('.swatch-grid .swatch[id^="pgSw"]').forEach(s => s.classList.remove('on'));
      const el = document.getElementById(swId);
      if (el) el.classList.add('on');
      toast('🎨 Page theme: ' + theme);
    }

    function setAccent(c1, c2, swId) {
      document.documentElement.style.setProperty('--accent', c1);
      document.documentElement.style.setProperty('--accent2', c2);
      document.querySelectorAll('.swatch-grid .swatch[id^="acSw"]').forEach(s => s.classList.remove('on'));
      const el = document.getElementById(swId);
      if (el) el.classList.add('on');
      toast('🖌️ Accent color changed');
    }

    // ════════════════════════════════════════════════════════
    //   OVERLAYS
    // ════════════════════════════════════════════════════════
    function toggleShortcuts() {
      document.getElementById('shortcutsOv').classList.toggle('open');
    }

    // ════════════════════════════════════════════════════════
    //   TOAST
    // ════════════════════════════════════════════════════════
    let tT;
    function toast(msg) {
      if (!features.toast) return;
      TOAST.textContent = msg;
      TOAST.classList.add('show');
      clearTimeout(tT);
      tT = setTimeout(() => TOAST.classList.remove('show'), 2400);
    }

    // ════════════════════════════════════════════════════════
    //   KEYBOARD SHORTCUTS
    // ════════════════════════════════════════════════════════
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      switch (e.key) {
        case '=': case '+': zoom(0.15); break;
        case '-': zoom(-0.15); break;
        case 'f': case 'F': fitToScreen(); break;
        case 'r': case 'R': resetView(); break;
        case 't': case 'T': rotateImg(); break;
        case 'g': case 'G': toggleGrid(); break;
        case 'm': case 'M': toggleMinimap(); break;
        case 'Enter': toggleFocus(); break;
        case 'x': case 'X': toggleCrosshair(); break;
        case 's': case 'S': toggleSettings(); break;
        case '1': zoomTo(1); break;
        case '2': zoomTo(2); break;
        case '3': zoomTo(3); break;
        case '?': toggleShortcuts(); break;
        case 'Escape':
          if (document.body.classList.contains('focus-mode')) toggleFocus();
          else if (document.getElementById('settingsOv').classList.contains('open')) toggleSettings();
          else if (document.getElementById('shortcutsOv').classList.contains('open')) toggleShortcuts();
          else if (document.fullscreenElement) document.exitFullscreen();
          CTX.classList.remove('open'); break;
        case 'F11': e.preventDefault(); toggleFS(); break;
        case 'ArrowLeft': panX += 50; render(); break;
        case 'ArrowRight': panX -= 50; render(); break;
        case 'ArrowUp': panY += 50; render(); break;
        case 'ArrowDown': panY -= 50; render(); break;
      }
    });

    // ════════════════════════════════════════════════════════
    //   INIT
    // ════════════════════════════════════════════════════════
    // Enable smooth pan transition by default
    IW.style.transition = 'transform 0.07s ease-out';