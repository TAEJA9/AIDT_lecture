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
// (기존 코드와 동일)

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

// ⭐️ [수정] rowHtml 함수: 순번 제거, 상태는 stateBadge 함수를 통해 한글로 표시
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
    // (기존 필터/정렬 로직과 동일)
    VIEW = RAW.filter(x => { /* ... */ }).sort((a, b) => { /* ... */ });
    $("appTbody").innerHTML = VIEW.map(it => rowHtml(it)).join('');
    // (카운트 업데이트 로직)
    
    // ⭐️ [수정] '관리' 버튼 클릭 시 openManage 함수 호출
    $("appTbody").querySelectorAll('button[data-id]').forEach(b => b.onclick = () => {
        const d = RAW.find(x => x.__id === b.dataset.id); 
        if (d) openManage(d.__id, d);
    });
}
// (이하 필터/정렬 이벤트 리스너 및 onSnapshot은 기존과 동일)

// ⭐️ [수정] '관리' 모달 기능 복구
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

function closeManage() { 
  $("manageModal").classList.add("hidden");
  SELECT_ID = null; 
}
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
// (기존 코드와 동일)

/* ==== 일정 관리 캘린더 ==== */
// (기존 코드와 동일)

/* ==== 수동 등록 모달 ==== */
// ⭐️ [수정] 저장 시 확정일자 로직 명확화
$('saveManualAdd').addEventListener('click', async () => {
  // (입력값 가져오는 부분은 동일)
  const payload = {
    // ... 기존 payload
  };
  
  // 수동 등록 시에도 확정 상태이면 approvedDate 필드를 채워줌
  if (payload.status === 'approved' && $('manualSchedule').value) {
    const [d, t] = $('manualSchedule').value.split('T');
    payload.approvedDate = d;
    payload.approvedTime = t?.slice(0,5) || '';
    payload.approvedISO = $('manualSchedule').value;
  }
  
  try {
    await addDoc(collection(db, 'applications'), payload);
    toast('수동 등록이 완료되었습니다.');
    // (모달 닫기)
  } catch (e) {
    // (에러 처리)
  }
});
// (이하 나머지 수동 등록 로직은 기존과 동일)
