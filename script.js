
const buckets = [];


let activeBucket = null;

const fileIcons = {
  video:    '🎬',
  image:    '🖼️',
  document: '📄',
  audio:    '🎵',
  other:    '📦'
};


document.getElementById('s3-name').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') createBucket();
});

document.getElementById('upload-name').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') uploadFile();
});


function notify(msg) {
  const el = document.getElementById('notif');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 2500);
}


function updateStats() {
  document.getElementById('stat-buckets').textContent = buckets.length;
  const totalObjects = buckets.reduce((sum, b) => sum + b.files.length, 0);
  document.getElementById('stat-objects').textContent = totalObjects;
}


function createBucket() {
  const name   = document.getElementById('s3-name').value.trim();
  const access = document.getElementById('s3-access').value;

  if (!name) { notify('Nama bucket kosong!'); return; }
  if (buckets.find(b => b.name === name)) { notify('Nama bucket sudah ada!'); return; }

  buckets.push({
    name,
    access,
    files: [],
    created: new Date().toLocaleDateString('id-ID')
  });

  document.getElementById('s3-name').value = '';
  renderBuckets();
  updateStats();
  notify('Bucket "' + name + '" dibuat!');
}


function deleteBucket(name) {
  const idx = buckets.findIndex(b => b.name === name);
  if (idx !== -1) buckets.splice(idx, 1);
  renderBuckets();
  updateStats();
  notify('Bucket dihapus.');
}


function renderBuckets() {
  const tbody = document.getElementById('s3-tbody');

  if (!buckets.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">No buckets yet. Create one above!</td></tr>';
    return;
  }

  tbody.innerHTML = buckets.map(b => `
    <tr>
      <td>
        <span style="color:#2563eb; cursor:pointer;" onclick="openDetail('${b.name}')">
          ${b.name}
        </span>
      </td>
      <td>
        <span class="badge ${b.access === 'Private' ? 'badge-private' : 'badge-public'}">
          ${b.access}
        </span>
      </td>
      <td>${b.files.length}</td>
      <td>${b.created}</td>
      <td style="display:flex; gap:6px;">
        <button class="btn-open" onclick="openDetail('${b.name}')">OPEN</button>
        <button class="btn-delete" onclick="deleteBucket('${b.name}')">DELETE</button>
      </td>
    </tr>`).join('');
}


function openDetail(name) {
  activeBucket = name;
  const bucket = buckets.find(b => b.name === name);

  document.getElementById('view-buckets').style.display = 'none';
  document.getElementById('view-detail').style.display = 'block';
  document.getElementById('detail-title').textContent = '// ' + name.toUpperCase();
  document.getElementById('detail-access').textContent = 'Access: ' + bucket.access;

  renderFiles();
}


function closeDetail() {
  activeBucket = null;
  document.getElementById('view-detail').style.display = 'none';
  document.getElementById('view-buckets').style.display = 'block';
}


function uploadFile() {
  const name = document.getElementById('upload-name').value.trim();
  const type = document.getElementById('upload-type').value;

  if (!name) { notify('Nama file kosong!'); return; }

  const bucket = buckets.find(b => b.name === activeBucket);
  bucket.files.push({
    name,
    type,
    uploaded: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  });

  document.getElementById('upload-name').value = '';
  renderFiles();
  updateStats();
  renderBuckets();
  notify('"' + name + '" uploaded!');
}


function deleteFile(index) {
  const bucket = buckets.find(b => b.name === activeBucket);
  bucket.files.splice(index, 1);
  renderFiles();
  updateStats();
  renderBuckets();
  notify('File dihapus.');
}


function renderFiles() {
  const bucket  = buckets.find(b => b.name === activeBucket);
  const listEl  = document.getElementById('file-list');
  const countEl = document.getElementById('detail-count');

  countEl.textContent = bucket.files.length + ' objects';

  if (!bucket.files.length) {
    listEl.innerHTML = '<div class="empty">Bucket masih kosong!</div>';
    return;
  }

  listEl.innerHTML = bucket.files
    .slice()
    .reverse()
    .map((f, reversedIdx) => {
   
      const originalIdx = bucket.files.length - 1 - reversedIdx;
      return `
        <div class="file-item">
          <div class="file-left">
            <span class="file-icon">${fileIcons[f.type] || '📦'}</span>
            <div>
              <div class="file-name">${f.name}</div>
              <div class="file-meta">${f.type.toUpperCase()} · ${f.uploaded}</div>
            </div>
          </div>
          <button class="btn-delete" onclick="deleteFile(${originalIdx})">DELETE</button>
        </div>`;
    })
    .join('');
}