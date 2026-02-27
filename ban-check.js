import { initializeApp }            from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, signOut }          from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, get, remove, update } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

const firebaseConfig = {
    apiKey:            "AIzaSyAnXMfYSzMs30oJEeRSCEqExx0gsksuutA",
    authDomain:        "zo-tinder.firebaseapp.com",
    databaseURL:       "https://zo-tinder-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId:         "zo-tinder",
    storageBucket:     "zo-tinder.firebasestorage.app",
    messagingSenderId: "866061631708",
    appId:             "1:866061631708:web:f2c70a3989032095803419"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

// ══════════════════════════════════════════════════════════════════════════
//  CALL THIS in home.js after user data is loaded:
//  import { checkBanStatus } from './ban-check.js';
//  await checkBanStatus(user.uid, userData);
//
//  CALL THIS in signin.js after login:
//  import { checkBanOnSignIn } from './ban-check.js';
//  await checkBanOnSignIn(user.uid);
// ══════════════════════════════════════════════════════════════════════════

// ── Format time remaining ─────────────────────────────────────────────────
function formatTimeLeft(ms) {
    if (ms <= 0) return '0s';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

// ── TEMP BAN OVERLAY ──────────────────────────────────────────────────────
// Injects a full-screen overlay over the homepage
// User can see the page behind but cannot interact with anything
function showTempBanOverlay(tempBan) {
    // Block ALL page interaction
    document.body.style.pointerEvents = 'none';
    document.body.style.userSelect    = 'none';

    // Inject CSS if not already there
    if (!document.getElementById('banOverlayStyle')) {
        const style = document.createElement('style');
        style.id = 'banOverlayStyle';
        style.textContent = `
            #tempBanOverlay {
                position: fixed;
                inset: 0;
                z-index: 999999;
                display: flex;
                align-items: flex-end;
                justify-content: center;
                background: rgba(0,0,0,0.7);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                animation: overlayIn 0.3s ease;
                pointer-events: all;
            }
            @keyframes overlayIn {
                from { opacity: 0; }
                to   { opacity: 1; }
            }
            #tempBanSheet {
                background: #14141c;
                border: 1px solid rgba(167,139,250,0.2);
                border-radius: 28px 28px 0 0;
                padding: 28px 24px 52px;
                width: 100%;
                max-width: 480px;
                animation: sheetUp 0.3s ease;
                pointer-events: all;
            }
            @keyframes sheetUp {
                from { transform: translateY(60px); opacity: 0; }
                to   { transform: translateY(0);    opacity: 1; }
            }
            #tempBanSheet .ban-handle {
                width: 40px; height: 4px;
                background: rgba(255,255,255,0.1);
                border-radius: 2px;
                margin: 0 auto 24px;
            }
            #tempBanSheet .ban-icon {
                font-size: 3rem;
                text-align: center;
                margin-bottom: 12px;
            }
            #tempBanSheet .ban-title {
                font-family: 'Bebas Neue', cursive, sans-serif;
                font-size: 1.6rem;
                letter-spacing: 2px;
                color: #a78bfa;
                text-align: center;
                margin-bottom: 8px;
            }
            #tempBanSheet .ban-reason-label {
                font-size: 11px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #444;
                margin-bottom: 6px;
            }
            #tempBanSheet .ban-reason-text {
                font-size: 14px;
                font-weight: 700;
                color: #aaa;
                line-height: 1.5;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.07);
                border-radius: 14px;
                padding: 14px 16px;
                margin-bottom: 20px;
            }
            #tempBanSheet .ban-countdown-label {
                font-size: 11px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #444;
                text-align: center;
                margin-bottom: 6px;
            }
            #tempBanSheet .ban-countdown {
                font-family: 'Bebas Neue', cursive, sans-serif;
                font-size: 2.2rem;
                letter-spacing: 3px;
                color: #a78bfa;
                text-align: center;
                margin-bottom: 24px;
            }
            #tempBanSheet .ban-lifted-btn {
                width: 100%;
                height: 50px;
                background: transparent;
                border: 1.5px solid rgba(255,255,255,0.1);
                border-radius: 16px;
                color: rgba(255,255,255,0.4);
                font-family: 'Nunito', sans-serif;
                font-size: 13px;
                font-weight: 800;
                cursor: pointer;
                pointer-events: all;
            }
        `;
        document.head.appendChild(style);
    }

    // Build overlay
    const overlay = document.createElement('div');
    overlay.id = 'tempBanOverlay';
    overlay.innerHTML = `
        <div id="tempBanSheet">
            <div class="ban-handle"></div>
            <div class="ban-icon">⏳</div>
            <div class="ban-title">Temporarily Banned</div>
            <div class="ban-reason-label">Reason for ban</div>
            <div class="ban-reason-text">${tempBan.reason || 'No reason provided'}</div>
            <div class="ban-countdown-label">Ban lifts in</div>
            <div class="ban-countdown" id="banCountdown">--:--:--</div>
            <button class="ban-lifted-btn" id="banCheckBtn">Check if ban was lifted</button>
        </div>
    `;
    document.body.appendChild(overlay);

    // Countdown timer
    const countdownEl = document.getElementById('banCountdown');
    const interval = setInterval(() => {
        const remaining = tempBan.until - Date.now();
        if (remaining <= 0) {
            clearInterval(interval);
            if (countdownEl) countdownEl.textContent = 'Lifting...';
            // Auto lift after a moment
            setTimeout(() => liftTempBan(tempBan.uid), 1500);
        } else {
            if (countdownEl) countdownEl.textContent = formatTimeLeft(remaining);
        }
    }, 1000);

    // Manual check button
    document.getElementById('banCheckBtn')?.addEventListener('click', async () => {
        const snap = await get(ref(db, `users/${tempBan.uid}/tempBan`));
        if (!snap.exists()) {
            liftTempBan(tempBan.uid);
            return;
        }
        const data = snap.val();
        if (!data.until || data.until <= Date.now()) {
            liftTempBan(tempBan.uid);
        } else {
            // Still banned — shake animation
            const sheet = document.getElementById('tempBanSheet');
            if (sheet) {
                sheet.style.animation = 'none';
                sheet.style.transform = 'translateX(10px)';
                setTimeout(() => {
                    sheet.style.transform = 'translateX(-10px)';
                    setTimeout(() => {
                        sheet.style.transform = 'translateX(0)';
                        sheet.style.animation = '';
                    }, 100);
                }, 100);
            }
        }
    });
}

// ── Lift temp ban — clean up and restore page ─────────────────────────────
async function liftTempBan(uid) {
    try {
        // Remove tempBan from Firebase
        await remove(ref(db, `users/${uid}/tempBan`));
    } catch(e) {
        console.error('liftTempBan error:', e);
    }
    // Remove overlay and restore interaction
    document.getElementById('tempBanOverlay')?.remove();
    document.body.style.pointerEvents = '';
    document.body.style.userSelect    = '';
}

// ══════════════════════════════════════════════════════════════════════════
//  checkBanStatus — call this in home.js after user data loads
// ══════════════════════════════════════════════════════════════════════════
export async function checkBanStatus(uid, data) {

    // ── Permanent ban ──────────────────────────────────────────────────────
    if (data.banned === true) {
        // Sign out and redirect to signin with banned flag
        await signOut(auth);
        window.location.href = `signin.html?banned=1&reason=${encodeURIComponent(data.banReason || 'No reason provided')}`;
        return true; // is banned
    }

    // ── Temp ban ───────────────────────────────────────────────────────────
    if (data.tempBan && data.tempBan.until) {
        const remaining = data.tempBan.until - Date.now();

        if (remaining > 0) {
            // Still banned — show overlay
            showTempBanOverlay({
                uid,
                until:  data.tempBan.until,
                reason: data.tempBan.reason || 'No reason provided',
            });
            return true; // is banned
        } else {
            // Expired — clean it up silently
            await remove(ref(db, `users/${uid}/tempBan`));
        }
    }

    return false; // not banned
}

// ══════════════════════════════════════════════════════════════════════════
//  checkBanOnSignIn — call this in signin.js right after successful login
//  before redirecting to home
// ══════════════════════════════════════════════════════════════════════════
export async function checkBanOnSignIn(uid) {
    try {
        const snap = await get(ref(db, `users/${uid}`));
        if (!snap.exists()) return false;

        const data = snap.val();

        // ── Permanent ban ────────────────────────────────────────────────
        if (data.banned === true) {
            await signOut(auth);
            window.location.href = `signin.html?banned=1&reason=${encodeURIComponent(data.banReason || 'No reason provided')}`;
            return true;
        }

        // ── Temp ban ─────────────────────────────────────────────────────
        if (data.tempBan && data.tempBan.until) {
            const remaining = data.tempBan.until - Date.now();
            if (remaining > 0) {
                // Let them in but home.js will catch it and show overlay
                return false;
            } else {
                // Expired — clean up
                await remove(ref(db, `users/${uid}/tempBan`));
            }
        }

        return false;
    } catch(e) {
        console.error('checkBanOnSignIn error:', e);
        return false;
    }
}

// ══════════════════════════════════════════════════════════════════════════
//  showBannedMessage — call this in signin.html on page load
//  to display the permanent ban message if redirected from home
//
//  Add this to signin.html:
//  import { showBannedMessage } from './ban-check.js';
//  showBannedMessage();
// ══════════════════════════════════════════════════════════════════════════
export function showBannedMessage() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('banned') !== '1') return;

    const reason = decodeURIComponent(params.get('reason') || 'No reason provided');

    // Inject the banned message into the signin page
    const style = document.createElement('style');
    style.textContent = `
        #bannedBanner {
            position: fixed;
            top: 0; left: 0; right: 0;
            z-index: 99999;
            background: #0d0000;
            border-bottom: 1px solid rgba(255,62,29,0.3);
            padding: 48px 20px 20px;
            animation: slideDown 0.4s ease;
        }
        @keyframes slideDown {
            from { transform: translateY(-100%); }
            to   { transform: translateY(0); }
        }
        #bannedBanner .bb-icon  { font-size: 2rem; text-align: center; margin-bottom: 10px; }
        #bannedBanner .bb-title {
            font-family: 'Bebas Neue', cursive, sans-serif;
            font-size: 1.4rem;
            letter-spacing: 2px;
            color: #ff3e1d;
            text-align: center;
            margin-bottom: 8px;
        }
        #bannedBanner .bb-sub {
            font-size: 12px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #444;
            margin-bottom: 6px;
        }
        #bannedBanner .bb-reason {
            font-size: 13px;
            font-weight: 700;
            color: #888;
            line-height: 1.5;
            background: rgba(255,62,29,0.06);
            border: 1px solid rgba(255,62,29,0.15);
            border-radius: 12px;
            padding: 12px 14px;
        }
    `;
    document.head.appendChild(style);

    const banner = document.createElement('div');
    banner.id = 'bannedBanner';
    banner.innerHTML = `
        <div class="bb-icon">🔨</div>
        <div class="bb-title">Account Permanently Banned</div>
        <div class="bb-sub">Reason for ban</div>
        <div class="bb-reason">${reason}</div>
    `;
    document.body.insertBefore(banner, document.body.firstChild);

    // Disable all form inputs and buttons on signin page
    setTimeout(() => {
        document.querySelectorAll('input, button').forEach(el => {
            el.disabled = true;
        });
    }, 100);
}
