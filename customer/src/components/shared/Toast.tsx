import React from 'react';
import { useApp } from '../../core/context/AppContext';
import { CheckCircle } from 'lucide-react';

const Toast: React.FC = () => {
  const { toastMessage } = useApp();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-toastSlideUp">
      <div className="bg-[#262824] text-white px-4 py-3 rounded-[2px] text-xs font-body flex items-center gap-2.5 shadow-2xl border border-[#3d403a]">
        <CheckCircle className="text-[#a4ab8e] shrink-0" size={16} />
        <span className="tracking-wide text-[13px]">{toastMessage}</span>
      </div>
    </div>
  );
};

export default Toast;
