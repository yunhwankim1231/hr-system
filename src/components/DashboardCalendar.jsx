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
    let dayNotes = Array.isArray(newNotes[editingNote.date]) 
      ? [...newNotes[editingNote.date]] 
      : (newNotes[editingNote.date] ? [newNotes[editingNote.date]] : []);
    
    if (editingNote.index !== undefined) {
      // 수정 중
      if (editingNote.text.trim() === '') {
        dayNotes.splice(editingNote.index, 1);
      } else {
        dayNotes[editingNote.index] = editingNote.text;
      }
    } else {
      // 신규 추가
      if (editingNote.text.trim() !== '') {
        dayNotes.push(editingNote.text);
      }
    }
    
    if (dayNotes.length === 0) {
      delete newNotes[editingNote.date];
    } else {
      newNotes[editingNote.date] = dayNotes;
    }
    
    if (setCalendarNotes) setCalendarNotes(newNotes);
    setEditingNote(null);
  };

  const handleDeleteNote = (date, index) => {
    if (window.confirm('이 메모를 삭제하시겠습니까?')) {
      const newNotes = { ...calendarNotes };
      let dayNotes = Array.isArray(newNotes[date]) ? [...newNotes[date]] : [newNotes[date]];
      
      dayNotes.splice(index, 1);
      
      if (dayNotes.length === 0) {
        delete newNotes[date];
      } else {
        newNotes[date] = dayNotes;
      }
      
      if (setCalendarNotes) setCalendarNotes(newNotes);
      // 만약 편집 중인 메모가 삭제된 것이라면 닫기
      if (editingNote && editingNote.index === index) {
        setEditingNote(null);
      }
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
          const rawNote = calendarNotes[noteKey];
          const notes = Array.isArray(rawNote) ? rawNote : (rawNote ? [rawNote] : []);
          
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
              onClick={() => d.current && setEditingNote({ date: noteKey, text: '', isList: true })}
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
                    style={{ 
                      background: hoveredDate === noteKey ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      color: hoveredDate === noteKey ? '#60a5fa' : 'var(--text-secondary)', 
                      cursor: 'pointer', 
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      opacity: notes.length > 0 || hoveredDate === noteKey ? 1 : 0.4
                    }}
                    title={notes.length > 0 ? "메모 관리" : "메모 추가"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNote({ date: noteKey, text: '', isList: true });
                    }}
                  >
                    {notes.length > 0 ? <Edit2 size={12} /> : <Plus size={12} />}
                  </button>
                )}
              </div>

              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {notes.slice(0, 3).map((note, idx) => (
                  <div key={idx} style={{ 
                    fontSize: '10px', 
                    padding: '2px 4px', 
                    background: 'rgba(59, 130, 246, 0.1)', 
                    borderRadius: '3px', 
                    color: 'var(--primary-color)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    borderLeft: '2px solid var(--primary-color)'
                  }}>
                    {note}
                  </div>
                ))}
                {notes.length > 3 && (
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    +{notes.length - 3}개 더보기
                  </div>
                )}
              </div>

              {hoveredDate === noteKey && notes.length > 0 && (
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
                  <div style={{ color: 'var(--primary-color)', fontSize: '11px', marginBottom: '6px', fontWeight: 'bold' }}>{noteKey} 메모 목록</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {notes.map((note, idx) => (
                      <div key={idx} style={{ padding: '4px 0', borderBottom: idx < notes.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        • {note}
                      </div>
                    ))}
                  </div>
                  <div style={{ position: 'absolute', top: '100%', left: '50%', marginLeft: '-5px', border: '5px solid transparent', borderTopColor: 'rgba(15, 23, 42, 0.95)' }}></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingNote && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: '450px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold' }}>{editingNote.date} 메모 관리</h4>
              <button onClick={() => setEditingNote(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            {editingNote.isList ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(() => {
                  const rawNote = calendarNotes[editingNote.date];
                  const notes = Array.isArray(rawNote) ? rawNote : (rawNote ? [rawNote] : []);
                  
                  return (
                    <>
                      {notes.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>작성된 메모가 없습니다.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {notes.map((note, idx) => (
                            <div key={idx} style={{ 
                              background: 'rgba(255,255,255,0.03)', 
                              padding: '12px', 
                              borderRadius: '8px', 
                              border: '1px solid rgba(255,255,255,0.05)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div style={{ fontSize: '14px', flex: 1, marginRight: '10px', whiteSpace: 'pre-wrap' }}>{note}</div>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button 
                                  onClick={() => setEditingNote({ ...editingNote, isList: false, text: note, index: idx })}
                                  className="btn-icon" style={{ width: '28px', height: '28px' }}
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteNote(editingNote.date, idx)}
                                  className="btn-icon" style={{ width: '28px', height: '28px', color: 'var(--danger-color)' }}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <button 
                        onClick={() => setEditingNote({ ...editingNote, isList: false, text: '', index: undefined })}
                        className="btn btn-primary" 
                        style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <Plus size={16} /> 새로운 메모 추가
                      </button>
                    </>
                  );
                })()}
              </div>
            ) : (
              <form onSubmit={handleSaveNote}>
                <textarea 
                  autoFocus
                  value={editingNote.text}
                  onChange={(e) => setEditingNote({ ...editingNote, text: e.target.value })}
                  placeholder="메모 내용을 입력하세요..."
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
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setEditingNote({ ...editingNote, isList: true })} className="btn btn-outline">목록으로</button>
                  <button type="submit" className="btn btn-primary">{editingNote.index !== undefined ? '수정 완료' : '추가하기'}</button>
                </div>
              </form>
            )}
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
