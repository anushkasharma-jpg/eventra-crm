/* ============================================================
   Eventra – Shared Frontend Script
   Shared across all pages:
     - API base URL
     - Event data
     - Toast notifications
     - Nav mobile toggle
     - Shared helpers
   ============================================================ */

// ── API base URL (update if deploying elsewhere) ──
const API_BASE = 'http://localhost:3000';

// ── Shared event data ──
const EVENTS = [
  {
    id: 'jazz-night',
    name: 'Jazz Under the Stars',
    description: 'An enchanting outdoor jazz evening featuring live musicians, craft cocktails, and a sky full of stars. Perfect for a romantic night out or a soul-refreshing escape.',
    date: '2026-05-15',
    category: 'Music',
    color: 'card-purple',
    emoji: '🎷'
  },
  {
    id: 'art-expo',
    name: 'Modern Art Expo 2025',
    description: 'Immerse yourself in a curated gallery of contemporary art from emerging and established artists. Interactive installations, artist talks, and more await.',
    date: '2026-05-10',
    category: 'Art',
    color: 'card-pink',
    emoji: '🎨'
  },
  {
    id: 'yoga-retreat',
    name: 'Weekend Wellness Retreat',
    description: 'A two-day wellness journey with sunrise yoga, guided meditation, nutrition workshops, and nature walks. Reconnect with yourself in a serene setting.',
    date: '2026-05-20',
    category: 'Wellness',
    color: 'card-mint',
    emoji: '🧘'
  },
  {
    id: 'tech-summit',
    name: 'Future Tech Summit',
    description: 'Meet the innovators shaping tomorrow. Keynotes on AI, sustainability tech, and digital transformation, followed by hands-on workshops and networking.',
    date: '2026-06-08',
    category: 'Technology',
    color: 'card-blue',
    emoji: '🚀'
  },
  {
    id: 'food-fest',
    name: 'Global Flavours Festival',
    description: 'Travel the world through food at this multicultural culinary festival. Over 40 vendors, live cooking demos, and a dedicated dessert zone.',
    date: '2026-06-11',
    category: 'Food & Culture',
    color: 'card-purple',
    emoji: '🍜'
  },
  {
    id: 'dance-gala',
    name: 'Dance Gala Evening',
    description: 'A spectacular showcase of classical, contemporary, and fusion dance forms by acclaimed performers. An evening of art, movement, and pure expression.',
    date: '2026-06-12',
    category: 'Performing Arts',
    color: 'card-pink',
    emoji: '💃'
  }
];

/**
 * Render an event card HTML string.
 * @param {Object} event
 * @param {number} index - used for staggered animation delay
 * @returns {string} HTML
 */
function renderEventCard(event, index) {
  const dotColors = {
    'card-purple': '#a78bfa',
    'card-pink':   '#f472b6',
    'card-mint':   '#34d399',
    'card-blue':   '#60a5fa'
  };
  const dotColor = dotColors[event.color] || '#a78bfa';

  return `
    <div class="event-card ${event.color}" style="animation-delay:${index * 0.08}s">
      <div class="card-color-bar"></div>
      <div class="card-body">
        <div class="card-meta">
          <span class="card-meta-dot" style="background:${dotColor}"></span>
          ${event.category}
        </div>
        <h3>${event.emoji} ${event.name}</h3>
        <p>${event.description}</p>
        <div class="card-date">
          📅 ${formatDate(event.date)}
        </div>
      </div>
      <div class="card-footer">
        <a href="book.html?event=${encodeURIComponent(event.name)}" class="btn btn-primary btn-sm" style="width:100%;justify-content:center">
          Book Now →
        </a>
      </div>
    </div>`;
}

/**
 * Format a date string (YYYY-MM-DD) into a human-readable form.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00'); // prevent timezone shift
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ══════════════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════════════ */

/**
 * Display a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration - ms before auto-dismiss
 */
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span>${message}</span>
    <button class="toast-close" aria-label="Close">×</button>`;

  container.appendChild(toast);

  // Close button
  toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));

  // Auto dismiss
  setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast) {
  toast.classList.add('removing');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
}

/* ══════════════════════════════════════════════
   MOBILE NAV TOGGLE
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !links.contains(e.target)) {
        links.classList.remove('open');
      }
    });
  }
});
// Smooth scroll reveal
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = 1;
      entry.target.style.transform = "translateY(0)";
    }
  });
});

document.querySelectorAll('.event-card, .feature-card').forEach(el => {
  el.style.opacity = 0;
  el.style.transform = "translateY(30px)";
  observer.observe(el);
});