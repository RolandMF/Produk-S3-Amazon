// ===========================
// DATA UTAMA
// ===========================

// Array bucket sebagai "server storage"
const buckets = [];

// Array untuk menyimpan semua riwayat aksi
const activityLog = [];

// Bucket yang sedang dibuka (detail view)
let activeBucket = null;

// Mapping ikon per tipe file
const fileIcons = {
  video:    '🎬',
  image:    '🖼️',
  document: '📄',
  audio:    '🎵',
  other:    '📦'
};

// ===========================
// ENTER KEY SHORTCUT
// ===========================
document.getElementById('s3-name').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') createBucket();
});

document.getElementById('upload-name').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') uploadFile();
});

// ===========================
// NAVIGASI SIDEBAR
// ===========================
function goPage(pageId, el) {
  // Sembunyikan semua halaman
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Hapus status aktif semua nav item
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Tampilkan halaman yang dipilih
  document.getElementById('page-' + pageId).classList.add('active');

  // Tandai nav item yang aktif
  if (el) el.classList.add('active');

  // Kalau balik ke buckets, pastikan yang tampil adalah list, bukan detail
  if (pageId === 'buckets') {
    document.getElementById('view-buckets').style.display = 'block';
    document.getElementById('view-detail').style.display = 'none';
  }
}

// ===========================
// NOTIFIKASI
// ===========================
function notify(msg) {
  const el = document.getElementById('notif');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 2500);
}

// ===========================
// ACTIVITY LOG
// ===========================

// Tambah satu baris ke log
function addActivity(action, target, detail) {
  activityLog.unshift({
    action,
    target,
    detail: detail || '-',
    time: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  });
  renderActivityLog();
  renderMiniActivity();
  updateStats();
}

// Render tabel full di halaman Activity Log
function renderActivityLog() {
  const tbody = document.getElementById('activity-tbody');
  if (!activityLog.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Belum ada aktivitas.</td></tr>';
    return;
  }
  tbody.innerHTML = activityLog.map((a, i) => `
    <tr>
      <td>${activityLog.length - i}</td>
      <td><span class="badge ${getBadgeClass(a.action)}">${a.action}</span></td>
      <td>${a.target}</td>
      <td>${a.detail}</td>
      <td>${a.time}</td>
    </tr>`).join('');
}

// Render 5 aktivitas terbaru di dashboard
function renderMiniActivity() {
  const tbody = document.getElementById('activity-mini-tbody');
  const recent = activityLog.slice(0, 5);
  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">Belum ada aktivitas.</td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(a => `
    <tr>
      <td><span class="badge ${getBadgeClass(a.action)}">${a.action}</span></td>
      <td>${a.target}</td>
      <td>${a.detail}</td>
      <td>${a.time}</td>
    </tr>`).join('');
}

// Tentukan class badge berdasarkan tipe aksi
function getBadgeClass(action) {
  if (action === 'CREATE') return 'badge-create';
  if (action === 'DELETE') return 'badge-del';
  if (action === 'UPLOAD') return 'badge-upload';
  return 'badge-private';
}

// Hapus semua log
function clearActivity() {
  activityLog.length = 0;
  renderActivityLog();
  renderMiniActivity();
  updateStats();
  notify('Activity log cleared!');
}

// ===========================
// UPDATE STAT CARDS
// ===========================
function updateStats() {
  document.getElementById('stat-buckets').textContent = buckets.length;

  const totalObjects = buckets.reduce((s, b) => s + b.files.length, 0);
  document.getElementById('stat-objects').textContent = totalObjects;

  // Total storage dari semua file di semua bucket
  const totalKB = buckets.reduce((s, b) =>
    s + b.files.reduce((fs, f) => fs + f.size, 0), 0);
  document.getElementById('stat-storage').textContent = formatSize(totalKB);

  document.getElementById('stat-activities').textContent = activityLog.length;
}

// ===========================
// HELPER: UKURAN FILE
// ===========================

// Generate ukuran acak (10 KB - 50 MB)
function randomSize() {
  if (Math.random() > 0.5) {
    return Math.floor(Math.random() * 990 + 10);       // 10 KB - 1000 KB
  } else {
    return Math.floor(Math.random() * 49000 + 1000);   // 1 MB - 50 MB
  }
}

// Format KB ke string yang readable
function formatSize(kb) {
  if (kb >= 1024) return (kb / 1024).toFixed(1) + ' MB';
  return kb + ' KB';
}

// Total ukuran semua file dalam satu bucket
function getBucketSize(bucket) {
  const total = bucket.files.reduce((s, f) => s + f.size, 0);
  return formatSize(total);
}

// ===========================
// CREATE BUCKET
// ===========================
function createBucket() {
  const name   = document.getElementById('s3-name').value.trim();
  const access = document.getElementById('s3-access').value;

  if (!name)                           { notify('Nama bucket kosong!');    return; }
  if (buckets.find(b => b.name===name)){ notify('Nama bucket sudah ada!'); return; }

  buckets.push({
    name,
    access,
    files: [],
    created: new Date().toLocaleDateString('id-ID')
  });

  document.getElementById('s3-name').value = '';
  renderBuckets();
  updateStats();
  addActivity('CREATE', name, 'Bucket baru · ' + access);
  notify('Bucket "' + name + '" dibuat!');
}

// ===========================
// DELETE BUCKET
// ===========================
function deleteBucket(name) {
  const idx = buckets.findIndex(b => b.name === name);
  if (idx !== -1) buckets.splice(idx, 1);
  renderBuckets();
  updateStats();
  addActivity('DELETE', name, 'Bucket dihapus');
  notify('Bucket "' + name + '" dihapus.');
}

// ===========================
// RENDER DAFTAR BUCKET
// ===========================
function renderBuckets() {
  const tbody  = document.getElementById('s3-tbody');
  const search = document.getElementById('search-bucket').value.toLowerCase();

  // Filter berdasarkan input search
  const filtered = buckets.filter(b => b.name.toLowerCase().includes(search));

  if (!filtered.length) {
    const msg = buckets.length
      ? 'Bucket tidak ditemukan.'
      : 'No buckets yet. Create one above!';
    tbody.innerHTML = `<tr><td colspan="6" class="empty">${msg}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(b => `
    <tr>
      <td>
        <span style="color:#60a5fa; cursor:pointer;" onclick="openDetail('${b.name}')">
          ${b.name}
        </span>
      </td>
      <td>
        <span class="badge ${b.access === 'Private' ? 'badge-private' : 'badge-public'}">
          ${b.access}
        </span>
      </td>
      <td>${b.files.length}</td>
      <td>${getBucketSize(b)}</td>
      <td>${b.created}</td>
      <td style="display:flex; gap:6px;">
        <button class="btn-open"   onclick="openDetail('${b.name}')">OPEN</button>
        <button class="btn-delete" onclick="deleteBucket('${b.name}')">DELETE</button>
      </td>
    </tr>`).join('');
}

// ===========================
// BUKA DETAIL BUCKET
// ===========================
function openDetail(name) {
  activeBucket = name;
  const bucket = buckets.find(b => b.name === name);

  document.getElementById('view-buckets').style.display = 'none';
  document.getElementById('view-detail').style.display  = 'block';
  document.getElementById('detail-title').textContent   = '// ' + name.toUpperCase();
  document.getElementById('detail-access').textContent  = 'Access: ' + bucket.access;

  renderFiles();
}

// ===========================
// KEMBALI KE BUCKET LIST
// ===========================
function closeDetail() {
  activeBucket = null;
  document.getElementById('view-detail').style.display  = 'none';
  document.getElementById('view-buckets').style.display = 'block';
}

// ===========================
// UPLOAD FILE
// ===========================
function uploadFile() {
  const name = document.getElementById('upload-name').value.trim();
  const type = document.getElementById('upload-type').value;

  if (!name) { notify('Nama file kosong!'); return; }

  const size   = randomSize();
  const bucket = buckets.find(b => b.name === activeBucket);

  bucket.files.push({
    name,
    type,
    size,
    uploaded: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  });

  document.getElementById('upload-name').value = '';
  renderFiles();
  updateStats();
  renderBuckets();
  addActivity('UPLOAD', activeBucket, name + ' · ' + formatSize(size));
  notify('"' + name + '" uploaded! (' + formatSize(size) + ')');
}

// ===========================
// DELETE FILE
// ===========================
function deleteFile(index) {
  const bucket   = buckets.find(b => b.name === activeBucket);
  const fileName = bucket.files[index].name;

  bucket.files.splice(index, 1);
  renderFiles();
  updateStats();
  renderBuckets();
  addActivity('DELETE', activeBucket, fileName + ' dihapus');
  notify('"' + fileName + '" dihapus.');
}

// ===========================
// RENDER DAFTAR FILE
// ===========================
function renderFiles() {
  const bucket  = buckets.find(b => b.name === activeBucket);
  const listEl  = document.getElementById('file-list');
  const countEl = document.getElementById('detail-count');

  countEl.textContent = bucket.files.length + ' objects · ' + getBucketSize(bucket);

  if (!bucket.files.length) {
    listEl.innerHTML = '<div class="empty">Bucket masih kosong!</div>';
    return;
  }

  listEl.innerHTML = bucket.files
    .slice()
    .reverse()
    .map((f, reversedIdx) => {
      // Hitung index asli supaya deleteFile() tepat sasaran
      const originalIdx = bucket.files.length - 1 - reversedIdx;
      return `
        <div class="file-item">
          <div class="file-left">
            <span class="file-icon">${fileIcons[f.type] || '📦'}</span>
            <div>
              <div class="file-name">${f.name}</div>
              <div class="file-meta">
                ${f.type.toUpperCase()} · ${formatSize(f.size)} · ${f.uploaded}
              </div>
            </div>
          </div>
          <button class="btn-delete" onclick="deleteFile(${originalIdx})">DELETE</button>
        </div>`;
    }).join('');
}
