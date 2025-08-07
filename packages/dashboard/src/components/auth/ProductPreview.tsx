import React from 'react';

export const ProductPreview: React.FC = () => {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Full-screen Dashboard Image */}
      <div className="absolute inset-0">
        <img 
          src="/dashboard-preview.png" 
          alt="StorySlip Dashboard Preview" 
          className="w-full h-full object-cover object-center"
          onError={(e) => {
            // Fallback to gradient background if image doesn't load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.className = 'absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800';
            }
          }}
        />
      </div>
    </div>
  );
};