import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, Plus, Edit2, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function DashboardCalendar() {
  const { calendarNotes = {}, setCalendarNotes } = useAppContext() || { calendarNotes: {} };
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingNote, setEditingNote] = useState(null); 
  const [hoveredDate, setHoveredDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const holidays = {
    '2024-01-01': '신정', '2024-02-09': '설날 연휴', '2024-02-10': '설날', '2024-02-11': '설날 연휴', '2024-02-12': '대체공휴일',
    '2024-03-01': '삼일절', '2024-04-10': '총선', '2024-05-05': '어린이날', '2024-05-06': '대체공휴일', '2024-05-15': '부처님오신날',
    '2024-06-06': '현충일', '2024-08-15': '광복절', '2024-09-16': '추석 연휴', '2024-09-17': '추석', '2024-09-18': '추석 연휴',
    '2024-10-01': '국군의날', '2024-10-03': '개천절', '2024-10-09': '한글날', '2024-12-25': '성탄절',
    '2025-01-01': '신정', '2025-01-28': '설날 연휴', '2025-01-29': '설날', '2025-01-30': '설날 연휴',
    '2025-03-01': '삼일절', '2025-03-03': '대체공휴일', '2025-05-05': '어린이날/부처님오신날', '2025-05-06': '대체공휴일',
    '2025-06-06': '현충일', '2025-08-15': '광복절', '2025-10-03': '개천절', '2025-10-05': '추석', '2025-10-06': '추석 연휴',
    '2025-10-07': '대체공휴일', '2025-10-08': '대체공휴일', '2025-10-09': '한글날', '2025-12-25': '성탄절'
  };

  const days = useMemo(() => {
    const arr = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      arr.push({ day: prevMonthLastDay - i, month: month - 1, current: false, dow: (firstDayOfMonth - 1 - i) });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      arr.push({ day: i, month: month, current: true, dow: (firstDayOfMonth + i - 1) % 7 });
    }
    const totalSlots = 42; 
    const nextMonthPadding = totalSlots - arr.length;
    for (let i = 1; i <= nextMonthPadding; i++) {
      const nextMonthFirstDayOfWeek = (firstDayOfMonth + daysInMonth) % 7;
      arr.push({ day: i, month: month + 1, current: false, dow: (nextMonthFirstDayOfWeek + i - 1) % 7 });
    }
    return arr;
  }, [year, month, firstDayOfMonth, daysInMonth]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getNoteKey = (d, m) => {
    const targetDate = new Date(year, m, d);
    return `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  };

  const handleSaveNote = (e) => {
    e.preventDefault();
    if (!editingNote) return;
    
    const newNotes = { ...calendarNotes };
    if (editingNote.text.trim() === '') {
      delete newNotes[editingNote.date];
    } else {
      newNotes[editingNote.date] = editingNote.text;
    }
    if (setCalendarNotes) setCalendarNotes(newNotes);
    setEditingNote(null);
  };

  const handleDeleteNote = (date) => {
    if (window.confirm('이 메모를 삭제하시겠습니까?')) {
      const newNotes = { ...calendarNotes };
      delete newNotes[date];
      if (setCalendarNotes) setCalendarNotes(newNotes);
      setEditingNote(null);
    }
  };

  return (
    <div className="glass-card" style={{ marginTop: '32px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={20} className="text-secondary" />
          일정 및 특이사항 메모
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={handlePrevMonth} className="btn-icon"><ChevronLeft size={20} /></button>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{year}년 {month + 1}월</span>
          <button onClick={handleNextMonth} className="btn-icon"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
        {['일', '월', '화', '수', '목', '금', '토'].map((d, idx) => (
          <div key={d} style={{ 
            padding: '12px', 
            textAlign: 'center', 
            background: 'rgba(255,255,255,0.02)', 
            fontSize: '13px', 
            color: idx === 0 ? 'var(--danger-color)' : idx === 6 ? '#3b82f6' : 'var(--text-secondary)', 
            fontWeight: '600' 
          }}>{d}</div>
        ))}
        {days.map((d, i) => {
          const noteKey = getNoteKey(d.day, d.month);
          const note = calendarNotes[noteKey];
          
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          const isToday = noteKey === todayStr;
          
          const isHoliday = holidays[noteKey];
          const isSunday = d.dow === 0;
          const isSaturday = d.dow === 6;

          let color = d.current ? 'var(--text-primary)' : 'rgba(255,255,255,0.15)';
          if (d.current) {
            if (isSunday || isHoliday) color = 'var(--danger-color)';
            else if (isSaturday) color = '#3b82f6';
          }

          return (
            <div 
              key={i} 
              style={{ 
                minHeight: '100px', 
                padding: '8px', 
                background: d.current ? 'rgba(30, 41, 59, 0.4)' : 'rgba(15, 23, 42, 0.2)',
                color: color,
                position: 'relative',
                transition: 'var(--transition)',
                cursor: d.current ? 'pointer' : 'default'
              }}
              onMouseEnter={() => d.current && setHoveredDate(noteKey)}
              onMouseLeave={() => setHoveredDate(null)}
              onClick={() => d.current && setEditingNote({ date: noteKey, text: note || '' })}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: isToday ? 'bold' : 'normal',
                    color: isToday ? 'var(--primary-color)' : color,
                    background: isToday ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>{d.day}</span>
                  {isHoliday && d.current && (
                    <span style={{ fontSize: '10px', color: 'var(--danger-color)', marginTop: '2px' }}>{isHoliday}</span>
                  )}
                </div>
                {d.current && (
                  <button 
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.1)', cursor: 'pointer', padding: '2px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNote({ date: noteKey, text: note || '' });
                    }}
                  >
                    {note ? <Edit2 size={12} /> : <Plus size={12} />}
                  </button>
                )}
              </div>

              {note && (
                <div style={{ 
                  marginTop: '4px', 
                  fontSize: '11px', 
                  padding: '4px 6px', 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  borderRadius: '4px', 
                  color: 'var(--primary-color)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  borderLeft: '2px solid var(--primary-color)'
                }}>
                  {note}
                </div>
              )}

              {hoveredDate === noteKey && note && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 50,
                  width: '200px',
                  background: 'rgba(15, 23, 42, 0.95)',
                  backdropFilter: 'blur(8px)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--card-border)',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  fontSize: '13px',
                  color: 'white',
                  marginBottom: '10px',
                  pointerEvents: 'none'
                }}>
                  <div style={{ color: 'var(--primary-color)', fontSize: '11px', marginBottom: '4px', fontWeight: 'bold' }}>{noteKey} 메모</div>
                  {note}
                  <div style={{ position: 'absolute', top: '100%', left: '50%', marginLeft: '-5px', border: '5px solid transparent', borderTopColor: 'rgba(15, 23, 42, 0.95)' }}></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingNote && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: '400px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold' }}>{editingNote.date} 메모 작성</h4>
              <button onClick={() => setEditingNote(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveNote}>
              <textarea 
                autoFocus
                value={editingNote.text}
                onChange={(e) => setEditingNote({ ...editingNote, text: e.target.value })}
                placeholder="특이사항을 입력하세요..."
                style={{ 
                  width: '100%', 
                  height: '120px', 
                  padding: '12px', 
                  background: 'rgba(0,0,0,0.2)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '8px', 
                  color: 'white', 
                  outline: 'none', 
                  resize: 'none',
                  fontSize: '14px',
                  marginBottom: '16px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                {calendarNotes[editingNote.date] && (
                  <button type="button" onClick={() => handleDeleteNote(editingNote.date)} className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>삭제</button>
                )}
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                  <button type="button" onClick={() => setEditingNote(null)} className="btn btn-outline">취소</button>
                  <button type="submit" className="btn btn-primary">저장하기</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .btn-icon {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition);
        }
        .btn-icon:hover {
          background: rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
}
