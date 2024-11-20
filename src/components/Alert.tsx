// components/Alert.tsx
import React from 'react';

interface AlertProps {
  children?: React.ReactNode;
  title?: string;
  description?: string;
}

const Alert: React.FC<AlertProps> = ({ children, title, description }) => (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
    {children}
    {title && <div className="font-medium">{title}</div>}
    {description && <div className="text-sm text-gray-600">{description}</div>}
  </div>
);

export { Alert };