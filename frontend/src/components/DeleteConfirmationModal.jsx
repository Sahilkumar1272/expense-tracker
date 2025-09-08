import React from 'react';

const DeleteConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Delete", 
  cancelText = "Cancel",
  isLoading = false,
  isBulk = false,
  count = 1
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-2xl p-6 border border-white/10 w-full max-w-md transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-white mb-3">
            {title || (isBulk ? `Delete ${count} Transactions?` : 'Delete Transaction?')}
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            {message || (isBulk 
              ? `Are you sure you want to delete ${count} selected transactions? This action cannot be undone.`
              : 'Are you sure you want to delete this transaction? This action cannot be undone.'
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-gray-600/80 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <span className="mr-2">🗑️</span>
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;

