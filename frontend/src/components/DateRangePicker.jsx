import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

const DateRangePicker = ({ startDate, endDate, onDateChange, onApply, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);

  const handleStartDateChange = (date) => {
    setTempStartDate(date);
  };

  const handleEndDateChange = (date) => {
    setTempEndDate(date);
  };

  const handleApply = () => {
    onDateChange(tempStartDate, tempEndDate);
    if (onApply) {
      onApply(tempStartDate, tempEndDate);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setIsOpen(false);
  };

  const quickSelectRanges = [
    {
      label: 'Last 3 Months',
      getValue: () => {
        const end = new Date();
        const start = subMonths(end, 3);
        return { start, end };
      }
    },
    {
      label: 'Last 6 Months',
      getValue: () => {
        const end = new Date();
        const start = subMonths(end, 6);
        return { start, end };
      }
    },
    {
      label: 'This Year',
      getValue: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        return { start, end };
      }
    },
    {
      label: 'Last Year',
      getValue: () => {
        const now = new Date();
        const start = new Date(now.getFullYear() - 1, 0, 1);
        const end = new Date(now.getFullYear() - 1, 11, 31);
        return { start, end };
      }
    }
  ];

  const handleQuickSelect = (range) => {
    const { start, end } = range.getValue();
    setTempStartDate(start);
    setTempEndDate(end);
    onDateChange(start, end);
    if (onApply) {
      onApply(start, end);
    }
    setIsOpen(false);
  };

  const customInputStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '0.5rem',
    padding: '0.75rem',
    color: 'white',
    fontSize: '0.875rem',
    width: '100%',
    cursor: 'pointer'
  };

  return (
    <div className={`relative ${className}`}>
      {/* Custom trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-800 border border-white/30 rounded-lg p-3 text-white text-left hover:bg-slate-700 transition-all duration-200 flex items-center justify-between shadow-lg"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">📅</span>
          <span className="text-sm">
            {startDate && endDate 
              ? `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`
              : 'Select Date Range'
            }
          </span>
        </div>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/30 rounded-xl shadow-2xl z-[9999] overflow-visible min-w-[600px]">
          {/* Quick select buttons */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white font-medium mb-3 text-sm">Quick Select</h3>
            <div className="grid grid-cols-2 gap-2">
              {quickSelectRanges.map((range, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSelect(range)}
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 px-3 rounded-lg transition-all duration-200 border border-white/20"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date pickers */}
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Start Date</label>
                <DatePicker
                  selected={tempStartDate}
                  onChange={handleStartDateChange}
                  selectsStart
                  startDate={tempStartDate}
                  endDate={tempEndDate}
                  maxDate={tempEndDate || new Date()}
                  customInput={
                    <input
                      style={customInputStyle}
                      readOnly
                      placeholder="Select start date"
                    />
                  }
                  dateFormat="MMM dd, yyyy"
                  showPopperArrow={false}
                  popperClassName="z-[10000]"
                  popperPlacement="bottom-start"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">End Date</label>
                <DatePicker
                  selected={tempEndDate}
                  onChange={handleEndDateChange}
                  selectsEnd
                  startDate={tempStartDate}
                  endDate={tempEndDate}
                  minDate={tempStartDate}
                  maxDate={new Date()}
                  customInput={
                    <input
                      style={customInputStyle}
                      readOnly
                      placeholder="Select end date"
                    />
                  }
                  dateFormat="MMM dd, yyyy"
                  showPopperArrow={false}
                  popperClassName="z-[10000]"
                  popperPlacement="bottom-end"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-4 border-t border-white/10 flex justify-end space-x-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-sm"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9998]" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default DateRangePicker;
