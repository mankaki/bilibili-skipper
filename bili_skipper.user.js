// ==UserScript==
// @name         B站自动跳片头片尾 (终极重构版)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  支持设置自定义片头片尾，播放时自动跳转，多路并发防冲突
// @author       mankaki (modified)
// @match        *://www.bilibili.com/video/*
// @match        *://www.bilibili.com/bangumi/play/*
// @match        *://www.bilibili.com/list/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        none
// @license      GPL-3.0
// ==/UserScript==

(function () {
  'use strict';

  const KEY_HEAD = 'bili_skip_head';
  const KEY_TAIL = 'bili_skip_tail';
  const KEY_ENABLED = 'bili_skip_enabled';

  // 修复因为 0 导致的 || 短路问题
  function getNumberFromStorage(key) {
    const val = localStorage.getItem(key);
    if (val === null || val === '') return null;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
  }

  let headSec = getNumberFromStorage(KEY_HEAD);
  let tailSec = getNumberFromStorage(KEY_TAIL);
  let enabled = localStorage.getItem(KEY_ENABLED) === 'true';

  // 创建浮窗
  const infoDiv = document.createElement('div');
  Object.assign(infoDiv.style, {
    position: 'fixed', bottom: '80px', right: '20px',
    padding: '8px 12px', background: 'rgba(0,0,0,0.7)',
    color: '#fff', fontSize: '14px', borderRadius: '4px',
    zIndex: 999999, fontFamily: 'sans-serif',
    opacity: 0, pointerEvents: 'none', transition: 'opacity 0.5s'
  });
  document.body.appendChild(infoDiv);

  let hideTimer = null;
  function showInfo() {
    const head = headSec !== null ? formatTime(headSec) : '—';
    const tail = tailSec !== null ? formatTime(tailSec) : '—';
    const status = enabled ? '✅ 开启' : '❌ 关闭';

    // 【重要改进】动态挂载 DOM，确保在 B 站进入真实的浏览器全屏（兼容 Safari）时依然能看到它
    const targetContainer = document.fullscreenElement || document.webkitFullscreenElement || document.body;
    if (infoDiv.parentNode !== targetContainer) {
      targetContainer.appendChild(infoDiv);
    }

    infoDiv.textContent = `片头: ${head}  片尾时长: ${tail}  状态: ${status}`;
    infoDiv.style.opacity = '1';

    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => infoDiv.style.opacity = '0', 3000);
  }

  function formatTime(sec) {
    if (sec < 0) return '00:00';
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = Math.floor(sec % 60);
    return (h > 0 ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function parseTime(str) {
    if (!str || str.trim() === '') return null;
    const normalizedStr = str.replace(/：/g, ':').trim(); // 兼容中文全角冒号
    let sec = 0;
    if (normalizedStr.includes(':')) {
      const p = normalizedStr.split(':').map(Number).reverse();
      sec = (p[0] || 0) + (p[1] || 0) * 60 + (p[2] || 0) * 3600;
    } else {
      sec = parseFloat(normalizedStr);
    }
    return isNaN(sec) ? null : sec;
  }

  function setTimes() {
    let h = prompt('设置片头时间 (格式 mm:ss 或秒数，不跳请留空):', headSec !== null ? formatTime(headSec) : '');
    if (h === null) return;

    let t = prompt('设置片尾时长 (格式 mm:ss 或秒数，表示跳最后多少时间):', tailSec !== null ? formatTime(tailSec) : '');
    if (t === null) return;

    headSec = parseTime(h);
    tailSec = parseTime(t);

    if (headSec === null && tailSec === null) {
      enabled = false;
    } else {
      enabled = true;
    }

    localStorage.setItem(KEY_HEAD, headSec === null ? '' : headSec);
    localStorage.setItem(KEY_TAIL, tailSec === null ? '' : tailSec);
    localStorage.setItem(KEY_ENABLED, enabled);

    // 配置更新后，清空页面上曾产生过的所有跳跃标志（为了能够即时生效）
    document.querySelectorAll('video').forEach(v => v.dataset.biliSkipTail = '');

    showInfo();
  }

  document.addEventListener('timeupdate', (e) => {
    const video = e.target;
    if (!enabled || video.tagName !== 'VIDEO') return;

    // 用精确的容器查询代替宽度判断，完美兼容原生画中画模式和后台运行
    if (!video.closest('.bpx-player-container, #bilibili-player, #bofqi')) return;

    if (isNaN(video.duration)) return;
    const currentTime = video.currentTime;
    const duration = video.duration;

    if (headSec !== null && currentTime < headSec) {
      video.currentTime = headSec;
    } else if (tailSec !== null && (duration - currentTime) <= tailSec) {
      // 把“是否跳过”作为标记挂接在各自所属的那个 video 身上！
      if (!video.dataset.biliSkipTail) {
        // 退一步海阔天空，不跳到最后死角，给B站组件加载下集模块的空间
        video.currentTime = Math.max(video.currentTime, duration - 1);
        video.dataset.biliSkipTail = 'true';
      }
    } else {
      video.dataset.biliSkipTail = '';
    }
  }, true);

  document.addEventListener('keydown', e => {
    // 穿透 B站 新版 Web Components(Shadow DOM) 获取真实的输入焦点
    let el = document.activeElement;
    while (el && el.shadowRoot && el.shadowRoot.activeElement) {
      el = el.shadowRoot.activeElement;
    }
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;

    // 获取修饰键状态，防止误杀系统/浏览器级快捷键（比如 Ctrl+O 开文件、Cmd+M 窗口最小化）
    const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

    if (e.key.toLowerCase() === 'm' && e.shiftKey && !hasModifier) {
      e.preventDefault();
      e.stopPropagation(); // 阻止事件冒泡，防止被 B站 内部的快捷键拦截器吞噬
      setTimes();
    }
    
    // 只在纯按 'o' 时触发，如果是 Shift+O 等也排除掉
    if (e.key.toLowerCase() === 'o' && !e.shiftKey && !hasModifier) {
      e.preventDefault();
      e.stopPropagation();
      enabled = !enabled;
      localStorage.setItem(KEY_ENABLED, enabled);
      showInfo();
    }
  }, true); // ★ 挂载在捕获阶段，第一时间拦截用户的按键动作

  showInfo();
})();
