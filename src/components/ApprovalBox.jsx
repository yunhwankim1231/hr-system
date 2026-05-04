import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function ApprovalBox() {
  const { employeeCategories } = useAppContext();
  const approvalLines = employeeCategories?.approval_lines || [];

  if (approvalLines.length === 0) return null;

  return (
    <div className="approval-box-container" style={{
      display: 'flex',
      justifyContent: 'flex-end',
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        border: '1px solid #000',
        background: '#fff',
        borderRadius: '2px'
      }}>
        <div style={{
          width: '30px',
          borderRight: '1px solid #000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          color: '#000',
          padding: '4px',
          writingMode: 'vertical-rl',
          background: '#eee',
          fontWeight: 'bold'
        }}>
          결재
        </div>
        {approvalLines.map((pos, idx) => (
          <div key={idx} style={{
            width: '65px',
            borderRight: idx === (approvalLines.length - 1) ? 'none' : '1px solid #000',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              height: '24px',
              borderBottom: '1px solid #000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              color: '#000',
              background: '#eee',
              fontWeight: '600'
            }}>
              {pos}
            </div>
            <div style={{ height: '50px' }}></div>
          </div>
        ))}
      </div>
    </div>
  );
}
