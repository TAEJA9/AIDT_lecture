import { initializeApp } from './firebase.js';
import {
  getFirestore, collection, onSnapshot, doc, updateDoc, serverTimestamp,
  addDoc, deleteDoc, getDocs, setDoc, getDoc
} from './firebase.js';

/* ==== Firebase ==== */
const firebaseConfig = {
  apiKey: "AIzaSyB3jHIYbOwFiIc4nqT8F9M_AdKwMVVNyLk",
  authDomain: "aidtlecture-d1b2b.firebaseapp.com",
  projectId: "aidtlecture-d1b2b",
  storageBucket: "aidtlecture-d1b2b.firebasestorage.app",
  messagingSenderId: "308403253257",
  appId: "1:308403253257:web:738b8941ae22350a6648d8"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

/* ==== DOM/UTIL ==== */
const $ = (id) => document.getElementById(id);
const toast = (m) => {
  const t = $("toast"); t.textContent = m; t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, 1500);
};

/* ==== 레이아웃 및 네비게이션 ==== */
document.addEventListener('DOMContentLoaded', () => {
    const layout = $('layout'), aside = $('aside');
    const asideToggle = $('asideToggle'), asideDesktopToggle = $('asideDesktopToggle'); 
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    const toggleAside = () => {
        const isDesktop = window.innerWidth >= 1024;
        if (isDesktop) { aside.classList.toggle('collapsed'); layout.classList.toggle('aside-collapsed'); } 
        else { aside.classList.toggle('open'); }
    };
    asideToggle.addEventListener('click', toggleAside);
    asideDesktopToggle.addEventListener('click', toggleAside);
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => { i.classList.remove('bg-indigo-500', 'text-white'); i.classList.add('hover:bg-gray-700'); });
            item.classList.add('bg-indigo-500', 'text-white');
            const viewId = `view-${item.dataset.view}`;
            viewSections.forEach(section => { section.classList.toggle('hidden', section.id !== viewId); });
            if (window.innerWidth < 1024 && aside.classList.contains('open')) { toggleAside(); }
        });
    });
    const initLayout = () => {
        if (window.innerWidth < 1024) { aside.classList.remove('open', 'collapsed'); layout.classList.remove('aside-collapsed'); } 
        else { aside.classList.remove('open'); }
    };
    window.addEventListener('resize', initLayout);
    initLayout();
});

/* ==== 신청 관리 ==== */
const STATE_BADGE = {
  pending:   { text: "신청중",   cls: "bg-yellow-100 text-yellow-800" },
  approved:  { text: "확정",     cls: "bg-blue-100 text-blue-800" },
  completed: { text: "진행완료", cls: "bg-green-100 text-green-800" },
  canceled:  { text: "취소",     cls: "bg-red-100 text-red-800" },
};
let RAW = [], VIEW = [];
let currentSort = { key: 'created_at', dir: 'desc' }; 

function fmtDT(d, t) { return ((d || '') + (t ? ` ${t}` : '')).trim() || '-'; }
function fmtCreated(ts) {
  if (!ts?.seconds) return '-';
  const dt = new Date(ts.seconds * 1000);
  const p = n => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
}
function stateBadge(s) {
  const badge = STATE_BADGE[s] || STATE_BADGE.pending;
  return `<span class="px-2.5 py-1 text-xs font-semibold rounded-full ${badge.cls}">${badge.text}</span>`;
}
function rowHtml(it) {
  let scheduleHtml = '';
  if (it.status === 'approved' && it.approvedDate) {
    scheduleHtml = `<div class="flex items-center gap-2"><span>${fmtDT(it.approvedDate, it.approvedTime)}</span><span class="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800"> 확정</span></div>`;
  } else {
    scheduleHtml = `<div class="text-xs"><div>1순위: ${fmtDT(it.wish1Date, it.wish1Time)}</div><div>2순위: ${fmtDT(it.wish2Date, it.wish2Time)}</div></div>`;
  }
  return `<tr class="hover:bg-gray-50">
      <td class="px-6 py-3">${fmtCreated(it.created_at)}</td>
      <td class="px-6 py-3 text-center">${stateBadge(it.status)}</td>
      <td class="px-6 py-3">${it.school_name || '-'}</td>
      <td class="px-6 py-3">${it.training_type || '-'}</td>
      <td class="px-6 py-3">${it.course_title || '-'}</td>
      <td class="px-6 py-3">${scheduleHtml}</td>
      <td class="px-6 py-3">${it.phone || '-'}</td>
      <td class="px-6 py-3 text-center">
        <button class="px-3 py-1 text-xs font-semibold rounded-md bg-indigo-500 text-white hover:bg-indigo-600" data-id="${it.__id}">관리</button>
      </td>
    </tr>`;
}

function applyFilterSort() {
    VIEW = RAW.filter(x => {
        const q = ($("filterInput").value || "").trim().toLowerCase();
        const st = $("statusFilter").value || "";
        if (st && x.status !== st) return false;
        if (!q) return true;
        return [x.school_name, x.course_title, x.training_type, x.phone, x.status].some(v => String(v || '').toLowerCase().includes(q));
    });
    VIEW.sort((a, b) => {
        const dir = currentSort.dir === 'asc' ? 1 : -1, k = currentSort.key;
        let av, bv;
        if (k === 'schedule') { av = a.status === 'approved' ? (a.approvedDate || '') : (a.wish1Date || ''); bv = b.status === 'approved' ? (b.approvedDate || '') : (b.wish1Date || ''); } 
        else if (k === 'created_at') { av = a.created_at?.seconds || 0; bv = b.created_at?.seconds || 0; } 
        else { av = (a[k] || '') + ''; bv = (b[k] || '') + ''; }
        if (av < bv) return -1 * dir; if (av > bv) return 1 * dir; return 0;
    });
    $("appTbody").innerHTML = VIEW.map(it => rowHtml(it)).join('');
    $("cntAll").textContent = RAW.length;
    $("cntPending").textContent = RAW.filter(x => x.status === 'pending').length;
    $("cntApproved").textContent = RAW.filter(x => x.status === 'approved').length;
    $("cntCanceled").textContent = RAW.filter(x => x.status === 'canceled').length;
    $("cntCompleted").textContent = RAW.filter(x => x.status === 'completed').length;
    $("appTbody").querySelectorAll('button[data-id]').forEach(b => b.onclick = () => {
        const d = RAW.find(x => x.__id === b.dataset.id); 
        if (d) openManage(d.__id, d);
    });
}
document.querySelectorAll('#appTable thead th[data-sort]').forEach(header => {
  header.addEventListener('click', () => {
    const k = header.dataset.sort;
    if (currentSort.key === k) { currentSort.dir = (currentSort.dir === 'asc' ? 'desc' : 'asc'); } 
    else { currentSort.key = k; currentSort.dir = 'asc'; }
    document.querySelectorAll('#appTable thead th[data-sort]').forEach(th => { th.classList.remove('asc', 'desc'); th.querySelector('.sort-icon').textContent = ''; });
    header.classList.add(currentSort.dir);
    header.querySelector('.sort-icon').textContent = currentSort.dir === 'asc' ? '▲' : '▼';
    applyFilterSort();
  });
});
onSnapshot(collection(db, 'applications'), (snap) => {
  RAW = []; snap.forEach((ds, i) => { const d = ds.data(); d.__id = ds.id; d.__idx = snap.size - i; RAW.push(d); });
  applyFilterSort();
});
$("filterInput").addEventListener('input', applyFilterSort);
$("statusFilter").addEventListener('change', applyFilterSort);

let SELECT_ID = null;
function openManage(id, d) {
  SELECT_ID = id;
  const badge = STATE_BADGE[d.status] || STATE_BADGE.pending;
  $("mStatusBadge").className = `px-2 py-1 text-xs font-semibold rounded-full ${badge.cls}`;
  $("mStatusBadge").textContent = badge.text;
  $("mSchool").textContent = d.school_name || '-';
  $("mContactName").textContent = d.contact_name || '-';
  $("mPhone").textContent = d.phone || '-';
  $("mType").textContent = d.training_type || '-';
  $("mCourse").textContent = d.course_title || '-';
  $("mWish1").textContent = fmtDT(d.wish1Date, d.wish1Time);
  $("mWish2").textContent = fmtDT(d.wish2Date, d.wish2Time);
  $("mStatus").innerHTML = Object.keys(STATE_BADGE).map(k => `<option value="${k}">${STATE_BADGE[k].text}</option>`).join('');
  $("mStatus").value = d.status || 'pending'; 
  $("mConfirmDT").value = d.approvedISO || d.confirm_dt || ""; 
  $("mMemo").value = d.admin_memo || "";
  $("manageModal").classList.remove("hidden");
}

function closeManage() { $("manageModal").classList.add("hidden"); SELECT_ID = null; }
$("closeManage").onclick = closeManage;
$("mOk").onclick = closeManage;

$("mSave").onclick = async () => {
  if (!SELECT_ID) return;
  const status = $("mStatus").value;
  const confirm_dt = $("mConfirmDT").value;
  const patch = { status, admin_memo: $("mMemo").value || "", last_updated: serverTimestamp() };
  if (status === 'approved' && confirm_dt) {
    const [d, t] = confirm_dt.split('T');
    patch.approvedDate = d; patch.approvedTime = t?.slice(0, 5) || ''; patch.approvedISO = confirm_dt;
  } else {
    patch.approvedDate = null; patch.approvedTime = null; patch.approvedISO = null;
  }
  await updateDoc(doc(db, 'applications', SELECT_ID), patch);
  toast('저장되었습니다.'); 
  closeManage();
};

/* ==== 강의 관리 ==== */
const COURSE_COL = 'courses';
let ALL_COURSES = [];
async function refreshCourses() {
    try {
        const s = await getDocs(collection(db, COURSE_COL));
        ALL_COURSES = s.docs.map(d => ({ id: d.id, ...d.data() }));
        const rows = ALL_COURSES.sort((a,b) => (a.order || 999) - (b.order || 999));
        $("courseTbody").innerHTML = rows.map(r => `
            <tr class="hover:bg-gray-50"><td class="px-6 py-4">${r.order ?? ''}</td><td class="px-6 py-4">${r.title || ''}</td><td class="px-6 py-4">${r.type || ''}</td><td class="px-6 py-4">${Array.isArray(r.tools) ? r.tools.join(', ') : ''}</td><td class="px-6 py-4">${r.recommend || ''}</td><td class="px-6 py-4">${r.effect || ''}</td><td class="px-6 py-4"><button class="px-3 py-1 text-xs font-semibold rounded-md bg-red-500 text-white hover:bg-red-600" data-del="${r.id}">삭제</button></td></tr>
        `).join('');
        $("courseTbody").querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
            if (!confirm('삭제하시겠어요?')) return;
            await deleteDoc(doc(db, COURSE_COL, b.dataset.del));
            toast('삭제됨'); refreshCourses();
        });
    } catch(e) { console.error(e); }
}
$("courseForm").addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = $("cTitle").value.trim(); if (!title) return;
    const payload = { title, type: $("cType").value, order: Number($("cOrder").value || 999), tools: ($("cTools").value || "").split(',').map(s=>s.trim()).filter(Boolean), recommend: $("cRecommend").value || "", effect: $("cEffect").value || "" };
    await addDoc(collection(db, COURSE_COL), payload);
    e.target.reset(); $("cTitle").focus(); toast('추가됨'); refreshCourses();
});
refreshCourses();

/* ==== 일정 관리 캘린더 ==== */
let calendarCursor = new Date(), openWeekdays = [1, 2, 3, 4, 5], extraOpenDates = [], extraCloseDates = [];
function renderAdminCalendar() {
    const year = calendarCursor.getFullYear(), month = calendarCursor.getMonth();
    $("adminCalTitle").textContent = `${year}년 ${month + 1}월`;
    const grid = $("adminCalGrid"); grid.innerHTML = "";
    const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) grid.insertAdjacentHTML('beforeend', '<div></div>');
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div'), date = new Date(year, month, day);
        const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const weekday = date.getDay(); cell.textContent = day;
        let classes = ['cal-cell-admin'];
        const isBaseOpen = openWeekdays.includes(weekday);
        if (extraOpenDates.includes(ymd)) classes.push('exception-open');
        else if (extraCloseDates.includes(ymd)) classes.push('exception-close');
        else if (isBaseOpen) classes.push('weekday');
        else classes.push('weekend');
        cell.className = classes.join(' ');
        cell.dataset.ymd = ymd; grid.appendChild(cell);
    }
}
$("adminCalGrid")?.addEventListener('click', (e) => {
    const ymd = e.target.dataset.ymd; if (!ymd) return;
    const weekday = new Date(ymd).getDay(), isBaseOpen = openWeekdays.includes(weekday);
    const openIdx = extraOpenDates.indexOf(ymd), closeIdx = extraCloseDates.indexOf(ymd);
    if (openIdx > -1) extraOpenDates.splice(openIdx, 1);
    else if (closeIdx > -1) extraCloseDates.splice(closeIdx, 1);
    else if (isBaseOpen) extraCloseDates.push(ymd);
    else extraOpenDates.push(ymd);
    updateExceptionInputs(); renderAdminCalendar();
});
function updateExceptionInputs() { $("openDates").value = extraOpenDates.sort().join(', '); $("closeDates").value = extraCloseDates.sort().join(', '); }
$("adminPrevMonth")?.addEventListener('click', () => { calendarCursor.setMonth(calendarCursor.getMonth() - 1); renderAdminCalendar(); });
$("adminNextMonth")?.addEventListener('click', () => { calendarCursor.setMonth(calendarCursor.getMonth() + 1); renderAdminCalendar(); });
const WEEK_LABEL=['일','월','화','수','목','금','토'];
(function buildWeekday(){ const wrap=$("weekdayWrap"); if(!wrap)return; for(let i=0;i<7;i++) { wrap.insertAdjacentHTML('beforeend', `<label class="flex items-center gap-2 p-2 rounded-md border has-[:checked]:bg-indigo-50 cursor-pointer"><input type="checkbox" id="w${i}" class="rounded"/><span>${WEEK_LABEL[i]}</span></label>`); $("w"+i).addEventListener('change', () => { openWeekdays = []; for(let j=0; j<7; j++) if($("w"+j).checked) openWeekdays.push(j); renderAdminCalendar(); }); } })();
async function loadCalendarCfg(){ try { const s = await getDoc(doc(db, 'config', 'calendar')); const cfg = s.exists() ? s.data() : {}; openWeekdays = cfg.openWeekdays || [1,2,3,4,5]; extraOpenDates = cfg.extraOpenDates || []; extraCloseDates = cfg.extraCloseDates || []; for (let i=0; i<7; i++) if($("w"+i)) $("w"+i).checked = openWeekdays.includes(i); updateExceptionInputs(); renderAdminCalendar(); } catch(e) { console.error(e) } }
$("saveCalendarCfg")?.addEventListener('click', async () => { const payload = { openWeekdays, extraOpenDates, extraCloseDates }; await setDoc(doc(db, 'config', 'calendar'), payload, { merge: true }); toast('저장되었습니다.'); });
loadCalendarCfg();

/* ==== 수동 등록 모달 ==== */
const manualAddModal = $('manualAddModal');
const manualTrainingType = $('manualTrainingType');
const manualCourseTitle = $('manualCourseTitle');
function openManualAddModal() {
  manualAddModal.querySelector('form')?.reset();
  $('manualStatus').innerHTML = Object.keys(STATE_BADGE).map(k => `<option value="${k}">${STATE_BADGE[k].text}</option>`).join('');
  manualTrainingType.innerHTML = `<option value="">선택</option><option value="AIDT">AIDT</option><option value="에듀테크">에듀테크</option>`;
  manualCourseTitle.innerHTML = `<option value="">연수 구분을 먼저 선택하세요</option>`;
  manualAddModal.classList.remove('hidden');
}
manualTrainingType.addEventListener('change', () => {
  const selectedType = manualTrainingType.value;
  if (!selectedType) { manualCourseTitle.innerHTML = `<option value="">연수 구분을 먼저 선택하세요</option>`; return; }
  const filteredCourses = ALL_COURSES.filter(c => c.type === selectedType);
  manualCourseTitle.innerHTML = `<option value="">강의 선택</option>` + filteredCourses.map(c => `<option value="${c.title}">${c.title}</option>`).join('');
});
$('manualAddBtn').addEventListener('click', openManualAddModal);
$('closeManualAdd').addEventListener('click', () => manualAddModal.classList.add('hidden'));
$('cancelManualAdd').addEventListener('click', () => manualAddModal.classList.add('hidden'));
$('saveManualAdd').addEventListener('click', async () => {
  const schoolName = $('manualSchoolName').value.trim();
  if (!schoolName) { toast('기관명은 필수입니다.'); return; }
  const schedule = $('manualSchedule').value;
  let wish1Date = '', wish1Time = '', approvedDate = null, approvedTime = null, approvedISO = null;
  const status = $('manualStatus').value;
  if (status === 'approved' && schedule) {
    [approvedDate, approvedTime] = schedule.split('T');
    approvedTime = approvedTime?.slice(0,5); approvedISO = schedule;
  } else if (schedule) {
    [wish1Date, wish1Time] = schedule.split('T');
    wish1Time = wish1Time?.slice(0,5);
  }
  const payload = {
    school_name: schoolName,
    contact_name: $('manualContactName').value.trim(),
    phone: $('manualPhone').value.trim(),
    status: status,
    training_type: $('manualTrainingType').value,
    course_title: $('manualCourseTitle').value,
    wish1Date, wish1Time, approvedDate, approvedTime, approvedISO,
    admin_memo: $('manualMemo').value.trim(),
    created_at: serverTimestamp()
  };
  try {
    await addDoc(collection(db, 'applications'), payload);
    toast('수동 등록이 완료되었습니다.');
    manualAddModal.classList.add('hidden');
  } catch (e) { toast('저장 중 오류가 발생했습니다: ' + e.message); console.error(e); }
});
