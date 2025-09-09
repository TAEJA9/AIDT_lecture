// app.js
import { initCalendar } from './calendar.js';
import { initializeApp } from './firebase.js';
import {
  getFirestore, collection, addDoc, serverTimestamp, doc, onSnapshot, getDocs,
  query, where, orderBy, getDoc, updateDoc, deleteDoc
} from './firebase.js';

/* ===== Firebase 설정 ===== */
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

/* ===== 캘린더 ===== */
initCalendar(db);

/* ===== 공통 ===== */
const $ = (id)=>document.getElementById(id);
const toast = (m)=>{ const t=$("toast"); if(!t) return; t.textContent=m; t.classList.remove("hidden"); setTimeout(()=>t.classList.add("hidden"),1500); };

/* =============================================================================
   프로그램 카드/드롭다운
============================================================================= */
const gridA = $("gridAIDT"), gridE = $("gridEDU"), empty = $("programEmpty");
const tabA  = $("tabAIDT"), tabE  = $("tabEDU");
const courseWrap = $("courseWrap"), courseDropdown = $("courseDropdown");
const fallbackCourses = [ { title:"ChatGPT 교육 활용 실습", type:"AIDT" }, { title:"AI 수업 보조도구 A-Z", type:"AIDT" }, { title:"디지털 콘텐츠 제작", type:"에듀테크" }, { title:"온라인 플랫폼 운영", type:"에듀테크" } ];
const normalizeType=(t)=> { const s=String(t||'').toLowerCase(); if(s.includes('aidt')||s==='ai')return'AIDT'; if(s.includes('edu')||s.includes('에듀'))return'에듀테크'; return t; };
const sortCourse=(a,b)=>(a.order||999)-(b.order||999) || (a.title||'').localeCompare(b.title||'','ko');
function cardHTML(c){ return `<div class="course-card" data-title="${c.title}"><div class="flex items-center justify-between mb-2"><h4 class="font-semibold text-slate-800">${c.title}</h4><span class="px-2.5 py-1 rounded-full text-xs font-semibold ${normalizeType(c.type)==='AIDT'?'bg-sky-100 text-sky-700':'bg-emerald-100 text-emerald-700'}">${normalizeType(c.type)}</span></div><p class="text-sm text-slate-600">추천: ${c.recommend||'-'}</p></div>`; }
function bindCard(el,c){ const modal=$("programModal"); el.addEventListener("click",()=>{ $("modalTitle").textContent=c.title; $("modalTool").textContent=Array.isArray(c.tools)?c.tools.join(", "):c.tools||"-"; $("modalRecommend").textContent=c.recommend||"-"; $("modalEffect").textContent=c.effect||"-"; modal?.classList.remove("hidden"); }); }
function renderPrograms(list){ if(!gridA||!gridE)return; gridA.innerHTML=""; gridE.innerHTML=""; const aidt=list.filter(x=>normalizeType(x.type)==='AIDT').sort(sortCourse); const edu =list.filter(x=>normalizeType(x.type)==='에듀테크').sort(sortCourse); if(aidt.length===0 && edu.length===0){empty?.classList.remove("hidden");return;} empty?.classList.add("hidden"); aidt.forEach(c=>{const w=document.createElement("div");w.innerHTML=cardHTML(c);const el=w.firstElementChild;bindCard(el,c);gridA.appendChild(el);}); edu.forEach(c=>{const w=document.createElement("div");w.innerHTML=cardHTML(c);const el=w.firstElementChild;bindCard(el,c);gridE.appendChild(el);}); }
const sources={courses:[],course:[]}; ['courses','course'].forEach(col=>{ try{ onSnapshot(collection(db,col),(snap)=>{ const arr=[]; snap.forEach(d=>{const x=d.data(); arr.push({id:d.id,title:x.title||'',type:normalizeType(x.type),tools:x.tools||[],recommend:x.recommend||x.recommendation||'',effect:x.effect||'',order:x.order});}); sources[col]=arr; const merged=[...sources.courses,...sources.course]; renderPrograms(merged.length?merged:fallbackCourses); ALL_COURSES=merged.length?merged:fallbackCourses; const selected=(document.querySelector('input[name="trainingType"]:checked')||{}).value; if(selected)fillCourse(ALL_COURSES.filter(c=>normalizeType(c.type)===selected).sort(sortCourse)); }); }catch(e){} });
tabA?.addEventListener("click",()=>{tabA.classList.add("active");tabE?.classList.remove("active");gridA?.classList.remove("hidden");gridE?.classList.add("hidden");});
tabE?.addEventListener("click",()=>{tabE.classList.add("active");tabA?.classList.remove("active");gridE?.classList.remove("hidden");gridA?.classList.add("hidden");});
$("closeModal")?.addEventListener("click",()=>$("programModal")?.classList.add("hidden"));
$("modalOk")?.addEventListener("click",()=>$("programModal")?.classList.add("hidden"));
let ALL_COURSES=[]; function fillCourse(items){ if(!courseDropdown)return; courseDropdown.innerHTML=`<option value="">강의를 선택하세요</option>`; items.forEach(c=>{const o=document.createElement("option");o.value=c.title;o.textContent=c.title;courseDropdown.appendChild(o);}); courseWrap?.classList.remove("hidden");}
document.querySelectorAll('input[name="trainingType"]').forEach(r=>{r.addEventListener("change",()=>{const wanted=r.value;const items=(ALL_COURSES.length?ALL_COURSES:fallbackCourses).filter(c=>normalizeType(c.type)===wanted).sort(sortCourse);fillCourse(items);});});


/* =============================================================================
   신청 시간 검증 및 조정
============================================================================= */
const wish1DT = $("wish1DT");
const wish2DT = $("wish2DT");

(function setMinDate(){
  const today = new Date();
  const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14, 0, 0, 0);
  const toLocalString = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00`;
  };
  const minStr = toLocalString(minDate);
  if (wish1DT) wish1DT.min = minStr;
  if (wish2DT) wish2DT.min = minStr;
})();

function validateTimeRange(inputEl, warnElId) {
  const warnEl = $(warnElId);
  if (!inputEl || !inputEl.value) {
    if (warnEl) warnEl.textContent = "";
    return true;
  }
  const timePart = inputEl.value.split('T')[1];
  if (!timePart) return true;
  const hour = parseInt(timePart.split(':')[0], 10);
  if (hour < 9 || hour > 20) {
    if (warnEl) warnEl.textContent = "⚠ 신청 시간은 09:00 ~ 20:00 사이만 가능합니다.";
    toast("신청 시간은 09:00 ~ 20:00 사이만 가능합니다.");
    inputEl.value = ""; 
    return false;
  }
  if (warnEl) warnEl.textContent = "";
  return true;
}

function snapTo30min(inputEl) {
  if(!inputEl || !inputEl.value) return;
  const [date, time] = inputEl.value.split('T');
  if(!time) return;
  let [h, m] = time.split(':').map(Number);
  const snappedM = (m < 15) ? 0 : (m < 45 ? 30 : 0);
  if(m >= 45) h = (h + 1) % 24;
  const pad = n => String(n).padStart(2,'0');
  inputEl.value = `${date}T${pad(h)}:${pad(snappedM)}`;
}

wish1DT?.addEventListener('change', () => { snapTo30min(wish1DT); validateTimeRange(wish1DT, "wish1Warn"); });
wish2DT?.addEventListener('change', () => { snapTo30min(wish2DT); validateTimeRange(wish2DT, "wish2Warn"); });


/* =============================================================================
   신청 폼 제출
============================================================================= */
let CAL_RULE={openWeekdays:[1,2,3,4,5], extraOpenDates:[], extraCloseDates:[]};
(async function loadPolicy(){ try{ const s=await getDoc(doc(db,"config","calendar")); if(s.exists()) CAL_RULE=s.data(); }catch{} })();

function validatePolicy(inputEl, warnId){
  const warn = $(warnId);
  if(!inputEl?.value){ if(warn) warn.textContent=""; return; }
  const datePart = inputEl.value.split('T')[0];
  const dt = new Date(datePart+"T00:00:00");
  const ymd = datePart;
  let ok = true;
  if(CAL_RULE.extraCloseDates?.includes(ymd)) ok=false;
  else if(CAL_RULE.extraOpenDates?.includes(ymd)) ok=ok&&true;
  else { const wd = dt.getDay(); ok = ok && (CAL_RULE.openWeekdays||[]).includes(wd); }
  if(warn) warn.textContent = ok ? warn.textContent : (warn.textContent || "") + "⚠ 휴무일에는 신청할 수 없습니다.";
  if(!ok) { inputEl.value = ""; toast("휴무일에는 신청할 수 없습니다."); }
}
wish1DT?.addEventListener('change', ()=>validatePolicy(wish1DT, "wish1Warn"));
wish2DT?.addEventListener('change', ()=>validatePolicy(wish2DT, "wish2Warn"));

$("applicationForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  if(!$("privacyAgree")?.checked){ toast("개인정보 동의가 필요합니다."); return; }
  const type=(document.querySelector('input[name="trainingType"]:checked')||{}).value;
  if(!type){ toast("연수 주제를 선택하세요."); return; }
  if(!courseDropdown?.value){ toast("상세 강의를 선택하세요."); return; }
  if(!wish1DT?.value){ toast("1순위 일시를 선택하세요."); return; }
  if(!validateTimeRange(wish1DT, "wish1Warn") || !validateTimeRange(wish2DT, "wish2Warn")) {
      toast("희망 일시의 시간을 확인해주세요.");
      return;
  }
  const [w1d, w1t] = wish1DT.value.split('T'); let w2d="", w2t="";
  if(wish2DT?.value){ [w2d, w2t] = wish2DT.value.split('T'); }
  const attendees=Number($("attendees")?.value||0);
  if(!(attendees>=1 && attendees<=40)){ toast("인원은 1~40명입니다."); return; }
  const payload = { region:$("region")?.value, org_type:$("orgType")?.value, school_name:$("schoolName")?.value, contact_name:$("contactName")?.value, email:$("email")?.value, phone:`${$("phone1")?.value}-${$("phone2")?.value}-${$("phone3")?.value}`, training_type:type, course_title:courseDropdown.value, wish1Date:w1d, wish1Time:w1t, wish2Date:w2d||"", wish2Time:w2t||"", attendees, inquiry: $("inquiry")?.value || "" };
  try{
    if(window.EDIT_ID){
      await updateDoc(doc(db,"applications",window.EDIT_ID), { ...payload, status:"pending" });
      const s=await getDoc(doc(db,"applications",window.EDIT_ID));
      if(s.exists() && typeof renderMyStatus==='function') renderMyStatus(window.EDIT_ID, s.data());
      $("editHint")?.classList.add("hidden"); window.EDIT_ID=null;
      toast("신청 내용이 수정되었습니다.");
    }else{
      const ref = await addDoc(collection(db,"applications"), { ...payload, status:"pending", created_at:serverTimestamp() });
      localStorage.setItem("myAppId", ref.id);
      onSnapshot(doc(db,"applications",ref.id),(snap)=>{ const d=snap.data(); if(d && typeof renderMyStatus==='function') renderMyStatus(ref.id, d); });
      toast("신청이 접수되었습니다!");
    }
    e.target.reset();
    document.querySelectorAll('input[name="trainingType"]').forEach(i=>i.checked=false);
    if(courseDropdown){ courseDropdown.innerHTML=`<option value="">강의를 선택하세요</option>`; courseWrap?.classList.add("hidden"); }
  }catch(err){ toast("신청 오류: "+(err.message||err)); }
});

function populateForm(d){ setTimeout(()=>{ if(courseDropdown){ courseDropdown.value=d.course_title||""; courseWrap?.classList.remove("hidden"); } }, 150); if(wish1DT) wish1DT.value = (d.wish1Date && d.wish1Time) ? `${d.wish1Date}T${d.wish1Time}` : ""; if(wish2DT) wish2DT.value = (d.wish2Date && d.wish2Time) ? `${d.wish2Date}T${d.wish2Time}` : ""; $("attendees") && ($("attendees").value = d.attendees || 1); $("inquiry") && ($("inquiry").value = d.inquiry || ""); }

// ⭐️ [추가] ESC 키로 모든 모달 닫기
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.add('hidden');
    });
  }
});
