// /public/calendar.js
import {
  collection, onSnapshot, doc, getDoc
} from "./firebase.js";

// 달력 초기화
export function initCalendar(db) {
  const $ = (id)=>document.getElementById(id);

  // DOM
  const prevBtn = $("prevMonth");
  const nextBtn = $("nextMonth");
  const titleEl = $("calTitle");
  const gridEl  = $("calGrid");

  const dayModal   = $("dayModal");
  const dayTitleEl = $("dayTitle");
  const dayTbody   = $("dayTbody");
  $("closeDay")?.addEventListener("click", ()=> dayModal.classList.add("hidden"));
  $("dayOk")?.addEventListener("click", ()=> dayModal.classList.add("hidden"));

  // 상태
  let cursor = new Date(); cursor.setDate(1);
  let DAY_INDEX = {}; 
  let CAL_RULE  = { openWeekdays:[1,2,3,4,5], extraOpenDates:[], extraCloseDates:[] };

  // 유틸
  const pad = (n)=>String(n).padStart(2,'0');
  const ymd = (y,m,d)=>`${y}-${pad(m)}-${pad(d)}`;
  const monthTitle = (d)=>`${d.getFullYear()}년 ${d.getMonth()+1}월`;

  // 정책 로드
  (async ()=>{ try{ const s=await getDoc(doc(db,'config','calendar')); if(s.exists()) CAL_RULE=s.data(); }catch{} render(); })();

  function chooseDateAndTime(d){
    if(d.status==='approved'){
      const date = d.approvedDate || (d.confirm_dt? d.confirm_dt.split('T')[0] : null);
      const time = d.approvedTime || (d.confirm_dt? d.confirm_dt.split('T')[1]?.slice(0,5) : '');
      return {date, time};
    }
    if(d.status==='pending' && d.wish1Date){
      return {date: d.wish1Date, time: d.wish1Time || ''};
    }
    return {date:null, time:''};
  }

  onSnapshot(collection(db,'applications'), (snap)=>{
    DAY_INDEX = {};
    snap.forEach(ds=>{
      const d = ds.data();
      const {date, time} = chooseDateAndTime(d);
      if(!date) return;
      const rec = {
        id: ds.id,
        status: d.status,
        training_type: d.training_type,
        school_name: d.school_name,
        course_title: d.course_title,
        time: (time||'').slice(0,5)
      };
      (DAY_INDEX[date] ||= []).push(rec);
    });
    render();
  });

  function render(){
    if(!gridEl) return;
    const y = cursor.getFullYear();
    const m = cursor.getMonth()+1;

    titleEl.textContent = monthTitle(cursor);
    gridEl.innerHTML = "";

    const first = new Date(y, m-1, 1);
    const firstW = first.getDay();
    const last  = new Date(y, m, 0).getDate();

    for(let i=0;i<firstW;i++){
      const e=document.createElement('div');
      e.className='cal-cell';
      gridEl.appendChild(e);
    }

    for(let d=1; d<=last; d++){
      const iso = ymd(y,m,d);
      const cell = document.createElement('div');
      cell.className='cal-cell';
      const today = new Date();
      if(d === today.getDate() && m === today.getMonth() + 1 && y === today.getFullYear()) {
        cell.classList.add('today');
      }

      const jsDate = new Date(`${iso}T00:00:00`);
      const wd = jsDate.getDay();
      const closedByWeek = !(CAL_RULE.openWeekdays||[]).includes(wd);
      const closedByList = (CAL_RULE.extraCloseDates||[]).includes(iso);
      const forceOpen    = (CAL_RULE.extraOpenDates||[]).includes(iso);
      const isDisabled   = (closedByWeek || closedByList) && !forceOpen;

      const head = document.createElement('div');
      head.className='cal-head';
      head.textContent = d;
      cell.appendChild(head);

      const list = (DAY_INDEX[iso]||[]).sort((a,b)=>{
        if(a.status!==b.status) return a.status==='approved' ? -1 : 1;
        return (a.school_name||'').localeCompare(b.school_name||'','ko');
      });

      if(list.length){
        const maxLines = 3;
        for(let i=0;i<Math.min(maxLines, list.length); i++){
          const it = list[i];
          const line = document.createElement('div');
          line.className='cal-line';
          const statusTxt = (it.status==='approved'?'확정':'신청중');
          line.innerHTML = `<span class="cal-status ${it.status==='approved'?'ok':'pend'}">(${statusTxt})</span>
                            <span class="cal-org">${it.school_name||'-'}</span>
                            ${it.time?`<span class="cal-time">${it.time}</span>`:''}`;
          cell.appendChild(line);
        }
        if(list.length>maxLines){
          const more=document.createElement('div');
          more.className='cal-more'; more.textContent = `+${list.length-maxLines}`;
          cell.appendChild(more);
        }
      }

      if(isDisabled){
        cell.classList.add('cal-disabled');
        cell.title='신청 불가(주말/휴무일).';
      }

      cell.addEventListener('click', ()=>{
        if(isDisabled || !list.length) return;
        dayTitleEl.textContent = `${y}년 ${m}월 ${d}일`;
        
        // ⭐️ [수정] 모달의 테이블 내용 생성 로직
        dayTbody.innerHTML = list.map((it,idx)=> {
          const statusBadge = it.status === 'approved' 
              ? `<span class="badge badge-approved">확정</span>`
              : `<span class="badge badge-pending">신청중</span>`;

          return `
            <tr>
              <td>${it.time || '-'}</td>
              <td>${statusBadge}</td>
              <td>${it.school_name || '-'}</td>
              <td>${it.course_title || '-'} <small class="text-slate-500">(${it.training_type})</small></td>
            </tr>
          `
        }).join('');
        dayModal.classList.remove('hidden');
      });

      gridEl.appendChild(cell);
    }
  }

  $("prevMonth")?.addEventListener('click', ()=>{ cursor = new Date(cursor.getFullYear(), cursor.getMonth()-1, 1); render(); });
  $("nextMonth")?.addEventListener('click', ()=>{ cursor = new Date(cursor.getFullYear(), cursor.getMonth()+1, 1); render(); });

  render();
}